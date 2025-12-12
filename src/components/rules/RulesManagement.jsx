import { PITCH_SMART_RULES } from '../../lib/pitchSmartRules'

export default function RulesManagement() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">⚾ Pitch Smart Guidelines</h2>
        <p className="text-gray-600 mt-2">
          Pitch count and rest requirements to protect young pitchers
        </p>
      </div>

      {/* Daily Max Pitches Table */}
      <div className="card mb-6">
        <h3 className="text-lg font-semibold mb-4">Daily Maximum Pitches</h3>
        <div className="overflow-x-auto">
          <table className="min-w-96 max-w-2xl">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                  AGE
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 border-b-2 border-gray-300">
                  DAILY MAX
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {PITCH_SMART_RULES.map((rule) => (
                <tr key={`${rule.ageMin}-${rule.ageMax}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {rule.ageMin}-{rule.ageMax}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {rule.maxPitchesPerGame}
                  </td>
                </tr>
              ))}
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
                {/* Dynamically create headers based on max rest days */}
                {[0, 1, 2, 3, 4].map((days) => (
                  <th
                    key={days}
                    className="px-4 py-3 text-center text-sm font-semibold text-gray-900 border-b-2 border-gray-300"
                  >
                    {days} {days === 1 ? 'Day' : 'Days'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {PITCH_SMART_RULES.map((rule) => (
                <tr key={`rest-${rule.ageMin}-${rule.ageMax}`} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm font-medium text-gray-900">
                    {rule.ageMin}-{rule.ageMax}
                  </td>
                  {/* Render cells for each rest day column */}
                  {[0, 1, 2, 3, 4].map((targetDays) => {
                    const range = rule.restDayRanges.find(r => r.restDays === targetDays)
                    return (
                      <td
                        key={targetDays}
                        className="px-4 py-4 text-sm text-center"
                      >
                        {range ? (
                          <span className="text-gray-900">
                            {range.maxPitches === 999 ? `${range.minPitches}+` : `${range.minPitches}-${range.maxPitches}`}
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-900">
            <strong>📌 Note:</strong> Rest days are calendar days required before a pitcher can pitch again in a game.
          </p>
        </div>
      </div>
    </div>
  )
}
