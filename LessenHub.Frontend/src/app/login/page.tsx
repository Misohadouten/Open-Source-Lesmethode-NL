'use client';

import { useState } from 'react';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSurfConextLogin = () => {
    setIsLoading(true);
    // Redirect to SurfConext authentication endpoint
    window.location.href = '/api/auth/surfconext';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center lh-page-title">
            Sign in to LessenHub
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Use your institution account to sign in
          </p>
        </div>

        <div className="mt-8">
          <button
            onClick={handleSurfConextLogin}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#0077b3] hover:bg-[#005a87] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0077b3] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              'Redirecting...'
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                Sign in with SurfConext
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}