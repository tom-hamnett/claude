import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/Layout';
import { EmptyState } from '../components/Empty';

export default function TemplatesPage() {
  const templates = useLiveQuery(() => db.templates.orderBy('updatedAt').reverse().toArray(), []);

  return (
    <div>
      <PageHeader
        title="Templates"
        subtitle="Reusable criterion sets — pick one when you start a session."
        actions={
          <Link to="/templates/new" className="btn-primary">
            <Icon name="plus" size={18} />
            New template
          </Link>
        }
      />

      {templates && templates.length === 0 ? (
        <EmptyState
          icon="template"
          title="No templates yet"
          description="Templates let you reuse criteria + scale across sessions. Create one for each lesson type, e.g. 'Rugby Skills' or 'Maths Plenary'."
          action={
            <Link to="/templates/new" className="btn-primary">
              <Icon name="plus" size={18} />
              New template
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates?.map((t) => (
            <Link
              key={t.id}
              to={`/templates/${t.id}`}
              className="card p-4 hover:shadow-lift transition flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink-800 truncate">{t.name}</div>
                  {t.description ? (
                    <div className="text-sm text-ink-500 line-clamp-2 mt-0.5">{t.description}</div>
                  ) : null}
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <Icon name="template" size={18} />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {t.tags.map((tag) => (
                  <span key={tag} className="chip">
                    <Icon name="tag" size={12} />
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-3 text-xs text-ink-500 flex items-center gap-3">
                <span>{t.criteria.length} criteria</span>
                <span>·</span>
                <span>
                  Scale {t.scale.min}–{t.scale.max}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
