import type { Session } from '../../shared/types';

interface SessionTimelineProps {
  sessions: Session[];
  onSessionClick?: (session: Session) => void;
}

interface TreeNode {
  session: Session;
  children: TreeNode[];
}

export default function SessionTimeline({ sessions, onSessionClick }: SessionTimelineProps) {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="text-sm text-center py-8" style={{ color: 'var(--color-text-tertiary)' }}>No sessions yet.</div>
    );
  }

  const sessionMap = new Map<string, Session>();
  sessions.forEach((s) => sessionMap.set(s.id, s));

  const roots: TreeNode[] = [];
  const childMap = new Map<string, Session[]>();

  sessions.forEach((s) => {
    if (s.parentSessionId) {
      const siblings = childMap.get(s.parentSessionId) || [];
      siblings.push(s);
      childMap.set(s.parentSessionId, siblings);
    } else {
      roots.push({ session: s, children: [] });
    }
  });

  function buildTree(nodes: TreeNode[]): TreeNode[] {
    return nodes.map((node) => {
      const kids = childMap.get(node.session.id) || [];
      return { ...node, children: buildTree(kids.map((s) => ({ session: s, children: [] }))) };
    });
  }

  const tree = buildTree(roots);

  function renderNode(node: TreeNode, depth: number) {
    const s = node.session;
    const hasChildren = node.children.length > 0;

    return (
      <div key={s.id} className={depth > 0 ? 'ml-6' : ''}>
        {depth > 0 && (
          <div className="relative">
            <div className="absolute left-[-1.5rem] top-0 bottom-0 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
            <div className="absolute left-[-1.5rem] top-4 w-4 h-px" style={{ backgroundColor: 'var(--color-border)' }} />
          </div>
        )}

        <div
          className="relative border rounded-lg p-3 hover:shadow-sm transition-shadow cursor-pointer mb-2"
          style={{ backgroundColor: 'var(--color-card-bg)', borderColor: 'var(--color-border)' }}
          onClick={() => onSessionClick?.(s)}
        >
          {depth > 0 && (
            <div className="absolute left-[-1.65rem] top-3.5 w-2.5 h-2.5 rounded-full border-2" style={{ backgroundColor: 'var(--color-accent)', borderColor: 'var(--color-card-bg)' }} />
          )}
          {depth === 0 && (
            <div className="absolute left-[-1.65rem] top-3.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2" style={{ borderColor: 'var(--color-card-bg)' }} />
          )}

          <h4 className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>{s.title}</h4>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-tertiary)' }}>
            {new Date(s.createdAt).toLocaleDateString()}
            {s.messages && <span className="ml-2">{s.messages.length} messages</span>}
          </div>
        </div>

        {hasChildren && (
          <div className="relative">
            <div className="absolute left-[-1.5rem] top-0 bottom-2 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {tree.length > 1 && (
        <div className="absolute left-[0.65rem] top-4 bottom-4 w-px" style={{ backgroundColor: 'var(--color-border)' }} />
      )}
      <div className="space-y-2">
        {tree.map((node) => renderNode(node, 0))}
      </div>
    </div>
  );
}
