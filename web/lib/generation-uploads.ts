import { ref as storageRef, uploadBytes, type FirebaseStorage } from 'firebase/storage'

type ContentListItem = { type?: string; text?: string; table_body?: string; page_idx?: number }

export async function uploadCoursePdf(storage: FirebaseStorage, userId: string, file: File): Promise<string> {
  const filename = `${crypto.randomUUID()}.pdf`
  const uploadRef = storageRef(storage, `course-pdfs/${userId}/${filename}`)
  const result = await uploadBytes(uploadRef, file)
  return result.ref.fullPath
}

export async function uploadCourseLayout(
  storage: FirebaseStorage,
  userId: string,
  contentList: ContentListItem[],
): Promise<string> {
  const layoutBlob = new Blob([JSON.stringify(contentList)], { type: 'application/json' })
  const layoutFilename = `${crypto.randomUUID()}.json`
  const layoutRef = storageRef(storage, `course-layouts/${userId}/${layoutFilename}`)
  const layoutResult = await uploadBytes(layoutRef, layoutBlob)
  return layoutResult.ref.fullPath
}
