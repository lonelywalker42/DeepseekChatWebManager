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
      <div className="text-sm text-gray-400 text-center py-8">No sessions yet.</div>
    );
  }

  // Build tree structure
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

  // Build tree recursively
  function buildTree(nodes: TreeNode[]): TreeNode[] {
    return nodes.map((node) => {
      const kids = childMap.get(node.session.id) || [];
      return {
        ...node,
        children: buildTree(kids.map((s) => ({ session: s, children: [] }))),
      };
    });
  }

  const tree = buildTree(roots);

  // Render a single node and its children
  function renderNode(node: TreeNode, depth: number) {
    const s = node.session;
    const hasChildren = node.children.length > 0;

    return (
      <div key={s.id} className={depth > 0 ? 'ml-6' : ''}>
        {/* Connector line for child nodes */}
        {depth > 0 && (
          <div className="relative">
            <div className="absolute left-[-1.5rem] top-0 bottom-0 w-px bg-gray-300" />
            <div className="absolute left-[-1.5rem] top-4 w-4 h-px bg-gray-300" />
          </div>
        )}

        {/* Node card */}
        <div
          className="relative border rounded-lg p-3 bg-white hover:shadow-sm transition-shadow cursor-pointer mb-2"
          onClick={() => onSessionClick?.(s)}
        >
          {/* Dot indicator on the timeline */}
          {depth > 0 && (
            <div className="absolute left-[-1.65rem] top-3.5 w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white" />
          )}
          {depth === 0 && (
            <div className="absolute left-[-1.65rem] top-3.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
          )}

          <h4 className="text-sm font-medium text-gray-900 truncate">{s.title}</h4>
          <div className="text-xs text-gray-400 mt-1">
            {new Date(s.createdAt).toLocaleDateString()}
            {s.messages && <span className="ml-2">{s.messages.length} messages</span>}
          </div>
        </div>

        {/* Children with vertical connector */}
        {hasChildren && (
          <div className="relative">
            <div className="absolute left-[-1.5rem] top-0 bottom-2 w-px bg-gray-300" />
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Main vertical line */}
      {tree.length > 1 && (
        <div className="absolute left-[0.65rem] top-4 bottom-4 w-px bg-gray-300" />
      )}
      <div className="space-y-2">
        {tree.map((node) => renderNode(node, 0))}
      </div>
    </div>
  );
}
