import type { CourseContent } from '@/core/models/learning-model'
import { courseContentNeedsCardRegeneration } from '@/lib/course-content-version'

export function hasReusableCachedCourseContent(
  fromCache: boolean,
  courseContent: CourseContent | null | undefined,
  hasLegacyOutline: boolean,
): boolean {
  return (
    fromCache &&
    !!courseContent?.chapters?.length &&
    !hasLegacyOutline &&
    !courseContentNeedsCardRegeneration(courseContent)
  )
}
