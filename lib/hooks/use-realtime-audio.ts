"use client"

import { useState, useRef, useEffect } from "react"
import {
  useRealtime,
  Message
} from "../context/transcription-context"
import { createFunctionCall } from "../function-calls"
import { useFunctionCall } from "../context/function-call-context"
import { useVoiceSession } from "../context/voice-session-context"
import { useAiContext } from "../context/ai-context"
import { usePlan } from "../context/plan-context"
import { useAgent } from "../context/agent-context"

interface UseRealtimeAudioProps {
  onDataChannelMessage?: (event: MessageEvent) => void
  context?: string
  onResponse?: (response: any) => void
  idMappings: Record<number, string>
}

interface UseRealtimeAudioReturn {
  isSessionActive: boolean
  dataChannel: RTCDataChannel | null
  audioLevels: number[]
  userAudioLevels: number[]
  startSession: (context: string) => Promise<void>
  stopSession: () => void
}

export function useRealtimeAudio({
  onDataChannelMessage,
  onResponse,
  idMappings
}: UseRealtimeAudioProps): UseRealtimeAudioReturn {
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null)
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(30).fill(0))
  const [userAudioLevels, setUserAudioLevels] = useState<number[]>(
    Array(30).fill(0)
  )
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const audioElement = useRef<HTMLAudioElement | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const userAnalyser = useRef<AnalyserNode | null>(null)
  const { addMessage, clearMessages } = useRealtime()
  const { processFunction } = useFunctionCall()
  const { todo_list } = usePlan()
  const { text: context, name: contextType } = useAiContext()
  const { 
    voice, 
    immediateExecution, 
    isSessionActive, 
    setIsSessionActive,
    getSessionInstructions,
    selectedFunctions
  } = useVoiceSession()
  const { executePlan } = useAgent()

  const calculateLevels = (analyserNode: AnalyserNode) => {
    const dataArray = new Uint8Array(analyserNode.frequencyBinCount)
    analyserNode.getByteFrequencyData(dataArray)

    const levelCount = 30
    const segmentLength = Math.floor(dataArray.length / levelCount)

    var res = Array.from({ length: levelCount }, (_, i) => {
      const start = i * segmentLength
      const segment = dataArray.slice(start, start + segmentLength)
      const average = segment.reduce((a, b) => a + b, 0) / segmentLength
      return Number((average / 255).toFixed(1))
    })

    // Take first 15 items, reverse them, and add to front of array
    const mirror = res.slice(0, 15).reverse()
    res = [...mirror, ...res.slice(0, 15)]

    return res
  }

  const updateAudioLevels = () => {
    if (!isSessionActive) return

    if (analyser.current) {
      setAudioLevels(calculateLevels(analyser.current))
    }

    if (userAnalyser.current) {
      setUserAudioLevels(calculateLevels(userAnalyser.current))
    }
  }

  // Start a realtime session
  const startSession = async () => {
    try {
      clearMessages()

      // Set up audio context and analyser
      audioContext.current = new AudioContext()
      analyser.current = audioContext.current.createAnalyser()
      analyser.current.fftSize = 2048

      // Set up to play remote audio from the model
      audioElement.current = document.createElement("audio")
      audioElement.current.autoplay = true

      // Original OpenAI connection logic
      const url = new URL("/api/realtime-token", window.location.origin)
      if (context) {
        url.searchParams.append("instructions", getSessionInstructions(context, contextType))
      }
      url.searchParams.append("selectedFunctions", JSON.stringify(selectedFunctions))
      url.searchParams.append("voice", voice)

      const tokenResponse = await fetch(url.toString())
      const data = await tokenResponse.json()
      const EPHEMERAL_KEY = data.client_secret.value

      const pc = new RTCPeerConnection()
      peerConnection.current = pc

      pc.ontrack = e => {
        if (audioElement.current && audioContext.current && analyser.current) {
          audioElement.current.srcObject = e.streams[0]

          // Connect audio to analyser
          const source = audioContext.current.createMediaStreamSource(
            e.streams[0]
          )
          source.connect(analyser.current)
        }
      }

      // Add local audio track for microphone input
      const ms = await navigator.mediaDevices.getUserMedia({
        audio: true
      })
      pc.addTrack(ms.getTracks()[0])

      // Add user audio analysis
      if (audioContext.current) {
        userAnalyser.current = audioContext.current.createAnalyser()
        userAnalyser.current.fftSize = 2048
        const userSource = audioContext.current.createMediaStreamSource(ms)
        userSource.connect(userAnalyser.current)
      }

      const dc = pc.createDataChannel("oai-events")
      setDataChannel(dc)

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const baseUrl = "https://api.openai.com/v1/realtime"
      const model = "gpt-4o-realtime-preview-2024-12-17"
      const sdpResponse = await fetch(
        `${baseUrl}?model=${model}&voice=${voice}`,
        {
          method: "POST",
          body: offer.sdp,
          headers: {
            Authorization: `Bearer ${EPHEMERAL_KEY}`,
            "Content-Type": "application/sdp"
          }
        }
      )

      const answer = new RTCSessionDescription({
        type: "answer",
        sdp: await sdpResponse.text()
      })
      await pc.setRemoteDescription(answer)

      setIsSessionActive(true)
    } catch (err) {
      console.error("Failed to start realtime session:", err)
    }
  }

  const stopSession = async () => {
    if (dataChannel) {
      dataChannel.close()
    }
    if (peerConnection.current) {
      peerConnection.current.close()
    }
    setIsSessionActive(false)
    setDataChannel(null)
    peerConnection.current = null
    setAudioLevels(Array(30).fill(0))
    setUserAudioLevels(Array(30).fill(0))
    clearMessages()

    // Execute plan if there's a todo_list when the session ends
    if (todo_list && todo_list.length > 0) {
      await executePlan(todo_list, context)
    }
  }

  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true)
      })

      const handleMessage = async (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          // Handle different message types from OpenAI
          if (data.type === "conversation.item.input_audio_transcription.completed") {
            console.log(data)
            const newMessage: Message = {
              role: "user",
              content: data.transcript,
              timestamp: Date.now()
            }

            addMessage(newMessage)
          } else if (data.type === "response.audio_transcript.done") {
            console.log(data)
            const newMessage: Message = {
              role: "assistant",
              content: data.transcript,
              timestamp: Date.now()
            }

            addMessage(newMessage)
          } else if (data.type === "response.function_call_arguments.done") {
            console.log("function call done")
            // Handle hang_up function call
            if (data.name === "hang_up") {
              stopSession()
              return
            } else {
              try {
                console.log(data)
                const functionCall = createFunctionCall(
                  data.name, 
                  JSON.parse(data.arguments), 
                  idMappings, 
                  immediateExecution
                )
                processFunction(functionCall)
                addMessage(functionCall)

                if (data.arguments.final) {
                  stopSession()
                }

                dataChannel.send(
                  JSON.stringify({
                    type: "response.create"
                  })
                )
              } catch (error) {
                console.error("Error parsing function call:", error)
              }
            }
          }

          onResponse?.(data)
        } catch (error) {
          console.error("Error parsing message:", error)
        }

        onDataChannelMessage?.(event)
      }

      dataChannel.addEventListener("message", handleMessage)

      return () => {
        dataChannel.removeEventListener("message", handleMessage)
      }
    }
  }, [dataChannel, onDataChannelMessage, onResponse, immediateExecution])

  // Animation frame loop for updating audio levels
  useEffect(() => {
    let animationFrameId: number

    const animate = () => {
      updateAudioLevels()
      animationFrameId = requestAnimationFrame(animate)
    }

    if (isSessionActive) {
      animate()
    }

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [isSessionActive])

  return {
    isSessionActive,
    dataChannel,
    audioLevels,
    userAudioLevels,
    startSession,
    stopSession
  }
}
