export default function MaintenancePage({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Under Maintenance</h1>
          <p className="text-gray-600">
            {message || 'The application is currently undergoing maintenance. Please check back soon.'}
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            We apologize for any inconvenience. The system will be back online shortly.
          </p>
        </div>
      </div>
    </div>
  )
}
