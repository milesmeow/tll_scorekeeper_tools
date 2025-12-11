export default function RulesManagement() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">⚾ Pitch Smart Guidelines</h2>
        <p className="text-gray-600 mt-2">
          MLB and USA Baseball pitch count and rest requirements to protect young pitchers
        </p>
      </div>

      {/* Daily Max Pitches Table */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Daily Maximum Pitches per Game</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                  AGE
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                  DAILY MAX (PITCHES IN GAME)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">7-8</td>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">50</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">9-10</td>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">75</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-900">11-12</td>
                <td className="px-6 py-4 text-sm text-gray-900 font-medium">85</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Required Rest Table */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Required Rest Days by Pitch Count</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                  AGE
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                  0 Days
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                  1 Day
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                  2 Days
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                  3 Days
                </th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                  4 Days
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm font-medium text-gray-900">7-8</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">1-20</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">21-35</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">36-50</td>
                <td className="px-4 py-4 text-sm text-center text-gray-500">N/A</td>
                <td className="px-4 py-4 text-sm text-center text-gray-500">N/A</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm font-medium text-gray-900">9-10</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">1-20</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">21-35</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">36-50</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">51-65</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">66+</td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-4 py-4 text-sm font-medium text-gray-900">11-12</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">1-20</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">21-35</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">36-50</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">51-65</td>
                <td className="px-4 py-4 text-sm text-center text-gray-900">66+</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-900">
            <strong>📌 Note:</strong> These guidelines are based on MLB and USA Baseball Pitch Smart recommendations.
            Rest days are calendar days (not practice days) required before a pitcher can pitch again in a game.
          </p>
        </div>
      </div>
    </div>
  )
}
