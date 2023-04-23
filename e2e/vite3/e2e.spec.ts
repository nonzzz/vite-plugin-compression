import vite from 'vite'
import { name } from './package.json'
import { runTest } from '../e2e'

runTest(name, { vite })
