import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// Regole del team (CLAUDE.md) e di sicurezza, controllate in automatico.
const teamRules = {
  'no-restricted-syntax': [
    'error',
    { selector: 'ConditionalExpression', message: 'Niente operatori ternari: usare if/else (regola del team).' },
    {
      selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
      message: 'Vietato: rischio XSS. Mostrare il testo come {valore} oppure usare make().',
    },
    {
      selector: "AssignmentExpression[left.property.name=/^(innerHTML|outerHTML)$/]",
      message: 'Vietato innerHTML/outerHTML con dati dinamici: usare make(), textContent, append.',
    },
  ],
  'no-restricted-imports': [
    'error',
    { paths: [{ name: 'lucide-react', message: 'Icone: usare @phosphor-icons/react (una sola famiglia).' }] },
  ],
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  'no-console': 'error',
}

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', 'src/lib/api-schema.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: teamRules,
  },
  {
    // Componenti generati da shadcn: si aggiornano con la CLI, non si riscrivono a mano.
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
