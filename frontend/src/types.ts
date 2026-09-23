import { z } from 'zod'

export const DriversSchema = z.array(z.object({
  session_key: z.number().int(),
  driver_number: z.number().int(),
  full_name: z.string().nullable(),
  name_acronym: z.string().nullable(),
  team_name: z.string().nullable(),
}))

export type Driver = z.infer<typeof DriversSchema>[number]

export const DriverComparisonDataSchema = z.object({
  driver_number: z.number().int(),
  lap_number: z.number().int(),
  lap_time_s: z.number(),
  sector_times_s: z.array(z.number().nullable()),
  speed_kmh: z.array(z.number()).nullable(),
})

export const ComparisonResultSchema = z.object({
  session_key: z.number().int(),
  driver_a: DriverComparisonDataSchema,
  driver_b: DriverComparisonDataSchema,
  lap_delta_s: z.number(),
  sector_deltas_s: z.array(z.number().nullable()),
  relative_distance: z.array(z.number()),
})

export const ApiErrorSchema = z.object({
  detail: z.string(),
})

export type DriverComparisonData = z.infer<typeof DriverComparisonDataSchema>
export type ComparisonResult = z.infer<typeof ComparisonResultSchema>
