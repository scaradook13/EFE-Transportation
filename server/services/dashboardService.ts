import { driverRepository } from '~~/server/repositories/driverRepository'
import { taxiUnitRepository } from '~~/server/repositories/taxiUnitRepository'
import { dispatchRepository } from '~~/server/repositories/dispatchRepository'
import { Dispatch } from '~~/server/models/Dispatch'
import dayjs from 'dayjs'

export const dashboardService = {
  async getStats() {
    await connectDB()

    const today = dayjs().startOf('day').toDate()
    const tomorrow = dayjs().endOf('day').toDate()
    const weekAgo = dayjs().subtract(7, 'days').startOf('day').toDate()

    const [
      totalDrivers,
      activeDrivers,
      totalTaxis,
      availableTaxis,
      onTripTaxis,
      maintenanceTaxis,
      totalDispatches,
      activeDispatches,
      completedDispatches,
      cancelledDispatches,
      todayDispatches
    ] = await Promise.all([
      driverRepository.count(),
      driverRepository.count({ employmentStatus: 'Active' }),
      taxiUnitRepository.count(),
      taxiUnitRepository.count({ status: 'Available' }),
      taxiUnitRepository.count({ status: 'On Trip' }),
      taxiUnitRepository.count({ status: 'Maintenance' }),
      dispatchRepository.count(),
      dispatchRepository.count({ status: 'Active' }),
      dispatchRepository.count({ status: 'Completed' }),
      dispatchRepository.count({ status: 'Cancelled' }),
      dispatchRepository.count({
        departureTime: { $gte: today, $lte: tomorrow }
      })
    ])

    // Weekly dispatch trend (last 7 days)
    const weeklyTrend = await Dispatch.aggregate([
      {
        $match: {
          departureTime: { $gte: weekAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$departureTime' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // Fill in missing days
    const trendData: Array<{ date: string; count: number }> = []
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'days').format('YYYY-MM-DD')
      const found = weeklyTrend.find((d: { _id: string; count: number }) => d._id === date)
      trendData.push({ date, count: found ? found.count : 0 })
    }

    const recentDispatches = await dispatchRepository.getRecentDispatches(5)

    return {
      stats: {
        totalDrivers,
        activeDrivers,
        totalTaxis,
        availableTaxis,
        onTripTaxis,
        maintenanceTaxis,
        totalDispatches,
        activeDispatches,
        completedDispatches,
        cancelledDispatches,
        todayDispatches
      },
      weeklyTrend: trendData,
      recentDispatches
    }
  }
}
