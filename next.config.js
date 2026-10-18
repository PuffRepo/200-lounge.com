/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  output: 'standalone',
  images: {},
  async redirects() {return [{source:'/new_stats',destination:'/stats?season=9',permanent:false}];},
}
