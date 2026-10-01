# React + TypeScript + Vite

## Styling

The application uses Tailwind CSS 4 through `@tailwindcss/vite`. Component styles
live in JSX utility classes. `src/index.css` contains the document reset, palette,
loading animation, and the original inclusive responsive variants: `wide` (1600px+),
`compact` (up to 1100px), `stacked` (up to 850px), `tablet` (601–850px),
`mobile` (up to 600px), and `tiny` (up to 380px).

Preflight is deliberately omitted to preserve native form controls and Plotly's
existing rendering. Exact pixel values and font shorthands preserve the original
spacing and typography. Plotly's layout configuration and data-driven sector bar
widths remain in JavaScript.

Run `npm run lint` and `npm run build` to check the application.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
