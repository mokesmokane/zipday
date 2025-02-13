import { processEnterKey } from '../entry-stage-manager'

declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchStringWithDiff(expected: string): R;
    }
  }
}

expect.extend({
    toMatchStringWithDiff(received: string, expected: string) {
      const diff = this.utils.diff(expected, received, {
        expand: true,
      });
      
      return {
        pass: received === expected,
        message: () => `
  String difference:
  ${diff}
  
  Character by character:
  Expected: ${expected.split('').map(c => c === '\n' ? '\\n' : c).join('|')}
  Received: ${received.split('').map(c => c === '\n' ? '\\n' : c).join('|')}
  `
      };
    },
  });   
describe('Entry Stage Manager', () => {
  describe('Task Entry Flow', () => {
    it('should handle empty input', () => {
      const input = '\n'
      expect(processEnterKey(input)).toBe('\n')
    })

    it('should add subtask after title', () => {
      const input = `Team Meeting
`
      const expected = `Team Meeting
- `
      expect(processEnterKey(input)).toMatchStringWithDiff(expected)
    })

    it('should continue subtasks after subtask', () => {
        const input = `Team Meeting
- Prepare agenda
`
        const expected = `Team Meeting
- Prepare agenda
- `
        const result = processEnterKey(input)
        expect(result).toMatchStringWithDiff(expected)
      })

      it('should start subtasks after title', () => {
        const input = `Team Meeting
`
        const expected = `Team Meeting
- `
        const result = processEnterKey(input)

        expect(result).toMatchStringWithDiff(expected)
      })
    
    it('should move to category after empty subtask', () => {
      const input = `Team Meeting
- Prepare agenda
- 
`
      const expected = `Team Meeting
- Prepare agenda
#`
        const result = processEnterKey(input)
        expect(result).toMatchStringWithDiff(expected)
    })

    it('should move to time after category', () => {
        const input = `Team Meeting
- Prepare agenda
#work
`
        const expected = `Team Meeting
- Prepare agenda
#work
@`
    
        const result = processEnterKey(input)
        expect(result).toMatchStringWithDiff(expected)
    })
    it('should move to time after blank category', () => {
        const input = `Team Meeting
- Prepare agenda
#
`
        const expected = `Team Meeting
- Prepare agenda
@`
        const result = processEnterKey(input)
        expect(result).toMatchStringWithDiff(expected)
    })
    it('should move to duration after time', () => {
        const input = `Team Meeting
- Prepare agenda
#work
@2:30
`
        const expected = `Team Meeting
- Prepare agenda
#work
@2:30
1h`
          const result = processEnterKey(input)
          expect(result).toMatchStringWithDiff(expected)
      })
      it('should move to duration after blank time', () => {
        const input = `Team Meeting
- Prepare agenda
#work
@
`
        const expected = `Team Meeting
- Prepare agenda
#work
1h`
          const result = processEnterKey(input)
          expect(result).toMatchStringWithDiff(expected)
      })

    it('should start new task after duration', () => {
      const input = `Team Meeting
- Prepare agenda
#work
@2:30
1h
`
      const expected = `Team Meeting
- Prepare agenda
#work
@2:30
1h
`
        const result = processEnterKey(input)

        expect(result).toMatchStringWithDiff(expected)
    })

    it('should handle description lines', () => {
      const input = `Team Meeting
- Prepare agenda
#work
@2:30
1h
Client Call
`
      const expected = `Team Meeting
- Prepare agenda
#work
@2:30
1h
Client Call
`
        const result = processEnterKey(input)

        expect(result).toMatchStringWithDiff(expected)
    })

    it('should handle empty lines between tasks', () => {
      const input = `Team Meeting
- Prepare agenda
#work
@2:30
1h

`
      const expected = `Team Meeting
- Prepare agenda
#work
@2:30
1h

`
        const result = processEnterKey(input)

        expect(result).toMatchStringWithDiff(expected)
    })

   
  })
}) 