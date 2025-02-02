import {
  FunctionCallFactory,
  FunctionCall,
  FunctionCallArgs,
  FunctionCallName,
  FunctionCallDefinition,
  UpdatePlanArgs,
  HangUpArgs
} from "@/types/function-call-types"

// Create a singleton instance
const functionCallFactory = new FunctionCallFactory()

// Export the instance for direct access if needed
export { functionCallFactory }

export const getFunctionDefinition = (
  name: FunctionCallName
): FunctionCallDefinition => {
  return functionCallFactory.getFunctionDefinition(name)
}

export const getAllFunctionDefinitions = (): FunctionCallDefinition[] => {
  return functionCallFactory.getAllFunctionDefinitions()
}

export const getSelectedFunctionDefinitions = (selectedFunctions: FunctionCallName[]): FunctionCallDefinition[] => {
  return selectedFunctions.map(name => functionCallFactory.getFunctionDefinition(name))
}

export const createFunctionCall = (
  name: FunctionCallName,
  args: FunctionCallArgs,
  idMappings: Record<string, string>,
  immediateExecution: boolean 
): FunctionCall => {
  console.log("idMappings", idMappings)
  console.log("args", args)
  console.log("name", name)
  return functionCallFactory.createFunctionCall(name, args, idMappings, immediateExecution)
}