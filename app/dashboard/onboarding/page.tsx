
'use client';

import { useState } from 'react';
import { useChat } from '@ai-sdk/react';

export default function Onboarding() {
  const [businessDescription, setBusinessDescription] = useState('');
  
  const {
    error,
    input,
    status,
    handleInputChange,
    handleSubmit,
    messages,
    reload,
    stop,
  } = useChat({
    api: '/api/onboarding-outcomes',
    body: { businessDescription },
  });

  return (
    <div className="flex flex-col w-full max-w-4xl pb-48 py-24 mx-auto">
      <h1 className="text-2xl font-bold mb-6">Business Onboarding</h1>
      
      {/* Input for business description */}
      <div className="mb-6">
        <label htmlFor="business-description" className="block text-lg font-medium mb-2">
          Tell us about your business
        </label>
        <textarea
          id="business-description"
          className="w-full p-3 border border-gray-300 rounded-lg min-h-32 shadow-sm"
          placeholder="Tell me about your business"
          value={businessDescription}
          onChange={(e) => setBusinessDescription(e.target.value)}
        />
        <button
          onClick={() => {
            if (businessDescription.trim()) {
              handleSubmit(new Event('submit') as unknown as React.FormEvent);
            }
          }}
          disabled={status !== 'ready' || !businessDescription.trim()}
          className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300"
        >
          Submit
        </button>
      </div>

      {/* Chat messages */}
      <div className="flex flex-col w-full stretch">
        {messages.map(m => (
          <div key={m.id} className="whitespace-pre-wrap mb-4 p-3 rounded-lg bg-gray-50">
            <span className="font-medium">{m.role === 'user' ? 'You: ' : 'Assistant: '}</span>
            {m.content}
          </div>
        ))}

        {(status === 'submitted' || status === 'streaming') && (
          <div className="mt-4 text-gray-500">
            {status === 'submitted' && <div>Loading...</div>}
            <button
              type="button"
              className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md"
              onClick={stop}
            >
              Stop
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4">
            <div className="text-red-500">An error occurred.</div>
            <button
              type="button"
              className="px-4 py-2 mt-4 text-blue-500 border border-blue-500 rounded-md"
              onClick={() => reload()}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
