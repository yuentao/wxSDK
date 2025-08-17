import babel from 'rollup-plugin-babel'
import { terser } from 'rollup-plugin-terser'

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/wxsdk-pure.js',
    format: 'umd',
    name: 'wxSDK',
  },
  plugins: [
    babel({
      exclude: 'node_modules/**',
    }),
    terser(), // 可选：压缩代码
  ],
}
