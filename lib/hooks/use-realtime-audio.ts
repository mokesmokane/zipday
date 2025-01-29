"use client"

import { useState, useRef, useEffect } from "react"
import { useRealtime, Message, Transcript } from "../context/transcription-context"
import { FunctionCall, FunctionCallFactory } from "@/types/function-call-types"
import { functionCallFactory } from "../function-calls"

interface UseRealtimeAudioProps {     
  onDataChannelMessage?: (event: MessageEvent) => void
  context?: string
  onResponse?: (response: any) => void
  vadEnabled?: boolean
  idMappings: Record<number, string>
}

interface UseRealtimeAudioReturn {
  isSessionActive: boolean
  dataChannel: RTCDataChannel | null
  audioLevels: number[]
  userAudioLevels: number[]
  realtimeMode: "debug" | "openai"
  voice: string
  startSession: (context: string) => Promise<void>
  stopSession: () => void
  setRealtimeMode: (mode: "debug" | "openai") => void
  setVoice: (voice: string) => void
}

export function useRealtimeAudio({
  onDataChannelMessage,
  context,
  idMappings,
  onResponse,
}: UseRealtimeAudioProps = { 
  idMappings: {}
}) {
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null)
  const [audioLevels, setAudioLevels] = useState<number[]>(Array(30).fill(0))
  const [userAudioLevels, setUserAudioLevels] = useState<number[]>(
    Array(30).fill(0)
  )
  const [realtimeMode, setRealtimeMode] = useState<"debug" | "openai">("debug")
  const [voice, setVoice] = useState<string>("alloy")
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const audioElement = useRef<HTMLAudioElement | null>(null)
  const audioContext = useRef<AudioContext | null>(null)
  const analyser = useRef<AnalyserNode | null>(null)
  const userAnalyser = useRef<AnalyserNode | null>(null)
  const { addMessage, clearMessages } = useRealtime()

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

    if (res[0] > 0.05) {
    }

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

  const getInstructions = (context: string) => `You are a highly efficient and professional personal assistant. Your role is to help your boss organize and prepare for their day in the most effective way possible.
  Here is their current schedule:
  ${context}
  Your primary goal is to package the day in a way that maximizes their efficiency, keeps them focused on what matters, and reduces their stress.
  They have ADHD so keep that in mind - though dont mention it.
  Its up to you to get all the informationfrom thaem sop that you can plan their day. You should drive the cadence of the conversation. Be as succint as possible

Your main task is to respond to your bosses commands

When generating your response, act as if you are making the first phone call of the day to your boss.

If your boss doesnt give you a clear instruction you can follow this structured approach:

1. Greeting and Energy Check:
Start the call by warmly greeting your boss and assessing their mindset:

Provide a positive and professional tone.
2. Quick Overview of the Day:
Summarize the key aspects of their schedule:

3. Highlight the primary focus or theme of the day (e.g., critical meetings, deadlines, or decisions).
Mention any major events or time-sensitive items.

4. Alert them to anything they may have missed from yesterday - ask them if they want to reschedule them or mark them as complete.

5. Follow-ups and Questions:
Ensure you understand their needs:

Ask if they have any additional focus areas or adjustments for the day.
Reassure them of your support and readiness to handle any tasks or updates they need.

Provide encouragement to set a confident tone for the day.
Confirm check-in points or next steps.
Constraints for Responses:
Be as concise as possible.
Proactive and Calm: Always offer solutions for potential challenges and avoid overwhelming them with unnecessary details.
Adapt to the Boss's Personality: Adjust tone and suggestions based on the boss's known preferences or mood.
Your responses should sound like you are speaking directly to your boss, focusing on clarity, efficiency, and professionalism.

As you are speaking, you should be making notes about what you need to do after the call. The way you do this is by calling the update_plan function.

The list of things on that plan is like a todo list - it high level but should have enough detail when in context to be actionable. You should be updating it as you go.

Your boss is called Mokes

DO NOT MAKE ANYTHING UP.
YOU MUST ONLY USE THE INFORMATION PROVIDED.

If your boss asks or commands you to do something ALWAYS UPDATE THE PLAN. 

`



  // Start a realtime session
  const startSession = async (context: string) => {
    try {
      clearMessages()

      if (realtimeMode === "debug") {
        // Debug mode - only set up local audio analysis
        const ms = await navigator.mediaDevices.getUserMedia({
          audio: true
        })

        if (audioContext.current) {
          userAnalyser.current = audioContext.current.createAnalyser()
          userAnalyser.current.fftSize = 2048
          const userSource = audioContext.current.createMediaStreamSource(ms)
          userSource.connect(userAnalyser.current)
        }

        setIsSessionActive(true)
        return
      }

      // Original OpenAI connection logic
      const url = new URL("/api/realtime-token", window.location.origin)
      if (context) {
        url.searchParams.append("instructions", getInstructions(context))
      }
      
      const tokenResponse = await fetch(url.toString())
      const data = await tokenResponse.json()
      const EPHEMERAL_KEY = data.client_secret.value

      const pc = new RTCPeerConnection()
      peerConnection.current = pc

      // Set up audio context and analyser
      audioContext.current = new AudioContext()
      analyser.current = audioContext.current.createAnalyser()
      analyser.current.fftSize = 2048

      // Set up to play remote audio from the model
      audioElement.current = document.createElement("audio")
      audioElement.current.autoplay = true

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

  const stopSession = () => {
    if (realtimeMode === "debug") {
      if (audioContext.current) {
        audioContext.current.close()
      }
      setIsSessionActive(false)
      setAudioLevels(Array(30).fill(0))
      setUserAudioLevels(Array(30).fill(0))
      clearMessages()
      return
    }

    if (dataChannel) {
      dataChannel.close()
    }
    if (peerConnection.current) {
      peerConnection.current.close()
    }
    if (audioContext.current) {
      audioContext.current.close()
    }
    setIsSessionActive(false)
    setDataChannel(null)
    peerConnection.current = null
    setAudioLevels(Array(30).fill(0))
    setUserAudioLevels(Array(30).fill(0))
    clearMessages()
  }

  useEffect(() => {
    if (dataChannel) {
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true)
      })

      const handleMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data)
          // Handle different message types from OpenAI
          if (data.type === 'conversation.item.input_audio_transcription.completed') {
            console.log(data)
            const newMessage: Message = {
              role: 'user',
              content: data.transcript,
              timestamp: Date.now()
            }
            
            addMessage(newMessage)
          } else if (data.type === 'response.audio_transcript.done') {
            console.log(data)
            const newMessage: Message = {
              role: 'assistant',
              content: data.transcript,
              timestamp: Date.now()
            }
            
            addMessage(newMessage)
          } else if (data.type === 'response.function_call_arguments.done') {
            console.log("function call done")
            // Handle hang_up function call
            if (data.name === 'hang_up') {
              stopSession()
              return
            }
            else {
              try {
                console.log(data)

                const newMessage = new FunctionCall(data.name, data.arguments, idMappings)
                
              addMessage(newMessage)
              if (data.arguments.final) {
                stopSession()
              }
          
              dataChannel.send(JSON.stringify({
                type: "response.create",
              }))
            }
            catch (error) {
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
  }, [dataChannel, onDataChannelMessage, onResponse])

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
    realtimeMode,
    voice,
    setVoice,
    setRealtimeMode,
    startSession,
    stopSession,
  } 
}
