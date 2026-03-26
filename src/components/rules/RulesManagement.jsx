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
          <table className="w-full max-w-2xl">
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

        <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-900">
            <strong>📌 Note:</strong> Training division has a maximum of 50 pitches regardless of age.
          </p>
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

      {/* Violation Rules Section */}
      <div className="card mt-6">
        <h3 className="text-lg font-semibold mb-1">Pitcher / Catcher Violation Rules</h3>

        <div className="divide-y divide-gray-100">
          {[
            {
              num: 1,
              title: 'Consecutive Innings Only',
              description: 'A pitcher must pitch consecutive innings — no gaps allowed. (e.g. innings 1, 2, 3 is OK; innings 1, 3 is not)',
              enforced: true,
            },
            {
              num: 2,
              title: '41+ Pitches — Cannot Catch',
              description: 'If a pitcher throws 41 or more pitches, they may not catch for the rest of that game.',
              enforced: true,
            },
            {
              num: 3,
              title: '4 Innings Catching — Cannot Pitch',
              description: 'If a player catches 4 or more innings, they may not pitch for the rest of that game.',
              enforced: true,
            },
            {
              num: 4,
              title: 'Catch 1–3 Innings + 21+ Pitches — Cannot Return to Catch',
              description: 'If a player catches 1–3 innings, then pitches 21 or more pitches, they may not return to catch in that same game.',
              enforced: true,
            },
            {
              num: 5,
              title: 'Age-Based Pitch Count Limit',
              description: 'Pitchers may not exceed the daily maximum for their age group (see table). Training division: flat 50-pitch maximum regardless of age.',
              enforced: true,
            },
            {
              num: 6,
              title: 'Required Rest Between Games',
              description: 'A pitcher may not pitch before their required rest period ends, based on the pitch count from their previous game.',
              enforced: true,
            },
            {
              num: 7,
              title: 'No Pitching 3 Days in a Row',
              description: 'A pitcher may not pitch in 3 consecutive calendar days.',
              enforced: true,
            },
          ].map(({ num, title, description, enforced }) => (
            <div key={num} className="flex items-start gap-4 py-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-700">{num}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">{title}</span>
                  {enforced ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      Checked by app
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm text-gray-600">{description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-900">
            <strong>📌 Note:</strong> Rules 1–7 are flagged automatically during game entry by admins. Games with violations are visually flagged on the Games page.
          </p>
        </div>
      </div>
    </div>
  )
}
