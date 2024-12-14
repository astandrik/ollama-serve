import { CodeExampleType } from "../types";

export const codeExamples: CodeExampleType[] = [
  {
    title: "Code Completion",
    description: "Complete code based on context and comments",
    language: "typescript",
    code: `// Create a function that sorts an array of objects by a key
interface User {
  name: string;
  age: number;
}

function sortUsersByAge`,
    prompt:
      "Complete this TypeScript function to sort users by age in ascending order",
  },
  {
    title: "Code Review",
    description: "Review code for potential issues and improvements",
    language: "python",
    code: `def process_data(data):
    results = []
    for i in range(len(data)):
        if data[i] > 0:
            results.append(data[i] * 2)
    return results`,
    prompt:
      "Review this Python code for performance, style, and potential improvements",
  },
  {
    title: "Bug Fixing",
    description: "Find and fix bugs in code",
    language: "javascript",
    code: `function fibonacci(n) {
    if (n <= 0) return 0;
    if (n == 1) return 1;
    return fibonacci(n) + fibonacci(n - 1);
}`,
    prompt: "Find and fix the bug in this recursive Fibonacci implementation",
  },
  {
    title: "Code Explanation",
    description: "Explain complex code or algorithms",
    language: "rust",
    code: `fn quick_sort<T: Ord>(arr: &mut [T]) {
    if arr.len() <= 1 {
        return;
    }
    let pivot = partition(arr);
    quick_sort(&mut arr[0..pivot]);
    quick_sort(&mut arr[pivot + 1..]);
}`,
    prompt: "Explain how this Rust quicksort implementation works",
  },
];
