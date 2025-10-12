export class GoogleGenerativeAI {
  constructor() {
    // no-op stub for tests
  }

  getGenerativeModel() {
    return {
      generateContent: async () => ({
        response: {
          text: () => '',
        },
      }),
    }
  }
}
