import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import postcss from 'rollup-plugin-postcss';

const production = process.env.BUILD === 'production';

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/widget.min.js',
      format: 'iife',
      name: 'ZaiaChat',
      sourcemap: !production
    },
    {
      file: 'dist/widget.esm.js',
      format: 'es',
      sourcemap: !production
    }
  ],
  plugins: [
    postcss({
      inject: true,
      minimize: production
    }),
    resolve({
      browser: true
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json'
    }),
    production && terser({
      compress: {
        drop_console: true
      }
    })
  ]
};
