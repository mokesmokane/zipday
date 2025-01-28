import { FunctionCallFactory, FunctionCall, FunctionCallArgs, FunctionCallName, FunctionCallDefinition, UpdatePlanArgs, HangUpArgs } from "@/types/function-call-types"

// Create a singleton instance
const functionCallFactory = new FunctionCallFactory()

// Export the instance for direct access if needed
export { functionCallFactory }


export const getFunctionDefinition = (name: FunctionCallName): FunctionCallDefinition => {
  return functionCallFactory.getFunctionDefinition(name)
}

export const getAllFunctionDefinitions = (): FunctionCallDefinition[] => {
  return functionCallFactory.getAllFunctionDefinitions()
}