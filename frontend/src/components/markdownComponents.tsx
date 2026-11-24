import type { Components } from 'react-markdown';

// Open every link inside rendered markdown in a new tab
export const markdownComponents: Components = {
  a: ({ node: _node, children, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
};
