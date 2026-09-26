import mongoose from 'mongoose'
import { User } from './server/models/User'
import { performance } from 'perf_hooks'

async function runBenchmark() {
  await mongoose.connect('mongodb://localhost:27017/efe_taxi_dispatch')
  
  await User.deleteOne({ username: 'perf_user' })
  const user = await User.create({ username: 'perf_user', password: 'password123', fullName: 'Perf', role: 'admin', isActive: true })

  const requestApi = async () => {
    const start = performance.now()
    try {
      const dbUser = await User.findById(user._id).select('+refreshTokenHash isActive')
      if (!dbUser || !dbUser.isActive) throw new Error()
      return { status: 200, time: performance.now() - start }
    } catch (e: any) {
      return { status: 401, time: performance.now() - start }
    }
  }

  const runConcurrent = async (concurrency: number, total: number) => {
    const latencies: number[] = []
    let successes = 0
    let failures = 0
    let active = 0
    let completed = 0
    let i = 0
    const startTotal = performance.now()
    
    return new Promise((resolve) => {
      const next = async () => {
        if (completed >= total) {
          latencies.sort((a, b) => a - b)
          const p50 = latencies[Math.floor(latencies.length * 0.5)]
          const p95 = latencies[Math.floor(latencies.length * 0.95)]
          const p99 = latencies[Math.floor(latencies.length * 0.99)]
          const rps = (total / (performance.now() - startTotal)) * 1000
          resolve({ p50, p95, p99, rps, successes, failures })
          return
        }
        while (active < concurrency && i < total) {
          active++
          i++
          requestApi().then((res: any) => {
            latencies.push(res.time)
            if (res.status === 200) successes++
            else failures++
            active--
            completed++
            next()
          })
        }
      }
      next()
    })
  }

  console.log('\n--- WARMUP ---')
  await runConcurrent(5, 50)

  for (const concurrency of [10, 50, 100]) {
    console.log(`\n--- BENCHMARK: ${concurrency} CONCURRENT USERS ---`)
    const result: any = await runConcurrent(concurrency, concurrency * 10)
    console.log(`Throughput: ${result.rps.toFixed(2)} ops/sec`)
    console.log(`P50 Latency: ${result.p50.toFixed(2)} ms`)
    console.log(`P95 Latency: ${result.p95.toFixed(2)} ms`)
    console.log(`P99 Latency: ${result.p99.toFixed(2)} ms`)
    console.log(`Success: ${result.successes}, Failures: ${result.failures}`)
  }

  await User.deleteOne({ username: 'perf_user' })
  await mongoose.disconnect()
}

runBenchmark()
