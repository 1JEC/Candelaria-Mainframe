import path from 'node:path'

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Several lockfiles exist above this directory; pin the root so Next does not
  // guess the wrong one when tracing output files.
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig
