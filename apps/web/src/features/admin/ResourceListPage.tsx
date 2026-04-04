import { Link } from 'react-router-dom';

import { Surface } from '../../components/layout';

export function ResourceListPage({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <Surface
      title={title}
      actions={
        <button className="rounded-full bg-gradient-to-r from-amber-300 to-rose-500 px-4 py-2 text-sm font-semibold text-slate-950" type="button">
          New
        </button>
      }
    >
      <p className="mb-4 text-slate-300">{description}</p>
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/6 text-slate-300">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-white/10 text-slate-100">
              <td className="px-4 py-3">Sample record</td>
              <td className="px-4 py-3">Active</td>
              <td className="px-4 py-3">Today</td>
              <td className="px-4 py-3">
                <Link className="text-amber-300" to=".">
                  Edit
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Surface>
  );
}
