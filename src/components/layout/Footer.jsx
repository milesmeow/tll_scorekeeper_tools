import packageJson from '../../../package.json'

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <p>⚾ Baseball Team Manager</p>
          <p>Version {packageJson.version}</p>
        </div>
      </div>
    </footer>
  )
}
