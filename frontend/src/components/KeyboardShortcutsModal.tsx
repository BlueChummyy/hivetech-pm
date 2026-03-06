import { Modal, ModalHeader, ModalBody } from '@/components/ui/Modal';

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const modKey = isMac ? '\u2318' : 'Ctrl';

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

function separator(keys: string[]): string {
  // Determine if keys use + or "then" separator
  // Mod keys use +, G sequences use "then"
  if (keys.length <= 1) return '';
  if (keys[0] === 'G') return 'then';
  return '+';
}

const groups: ShortcutGroup[] = [
  {
    title: 'Global',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: [modKey, 'K'], description: 'Focus search' },
      { keys: ['Esc'], description: 'Close modal / panel' },
      { keys: ['B'], description: 'Toggle sidebar' },
      { keys: [modKey, '/'], description: 'Toggle sidebar (alt)' },
      { keys: [modKey, 'N'], description: 'New task' },
      { keys: [modKey, 'Shift', 'N'], description: 'New project' },
      { keys: [modKey, 'Shift', 'F'], description: 'Advanced filter' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['G', 'D'], description: 'Go to Dashboard' },
      { keys: ['G', 'M'], description: 'Go to My Tasks' },
      { keys: ['G', 'N'], description: 'Go to Notifications' },
      { keys: ['G', 'P'], description: 'Go to Projects' },
      { keys: ['G', 'A'], description: 'Go to Admin' },
      { keys: ['G', 'S'], description: 'Go to Settings' },
    ],
  },
  {
    title: 'List Navigation',
    shortcuts: [
      { keys: ['J'], description: 'Move focus down' },
      { keys: ['K'], description: 'Move focus up' },
      { keys: ['Enter'], description: 'Open focused task' },
    ],
  },
  {
    title: 'Task Actions',
    shortcuts: [
      { keys: ['N'], description: 'New task (on project pages)' },
      { keys: ['E'], description: 'Edit focused task' },
      { keys: ['1', '4'], description: 'Set priority (1=Urgent ... 4=Low)' },
      { keys: [modKey, 'D'], description: 'Duplicate task' },
      { keys: ['Del'], description: 'Delete task' },
    ],
  },
];

export function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-lg">
      <ModalHeader onClose={onClose}>Keyboard Shortcuts</ModalHeader>
      <ModalBody className="space-y-5 max-h-[70vh] overflow-y-auto">
        {groups.map((group) => (
          <div key={group.title}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-surface-500">
              {group.title}
            </h3>
            <div className="space-y-1.5">
              {group.shortcuts.map((shortcut) => {
                const sep = separator(shortcut.keys);
                return (
                  <div
                    key={shortcut.description}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-surface-300">
                      {shortcut.description}
                    </span>
                    <span className="flex shrink-0 items-center gap-1">
                      {shortcut.keys.map((key, i) => (
                        <span key={i}>
                          {i > 0 && (
                            <span className="mx-0.5 text-xs text-surface-600">
                              {sep === 'then' ? 'then' : '+'}
                            </span>
                          )}
                          <kbd className="inline-flex min-w-[1.5rem] items-center justify-center rounded border border-surface-600 bg-surface-700 px-1.5 py-0.5 text-xs font-medium text-surface-300">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </ModalBody>
    </Modal>
  );
}
