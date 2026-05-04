const ACCEPTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const TARGET_SIZES = [384, 320, 256]
const QUALITY_STEPS = [0.84, 0.76, 0.68, 0.6]
const MAX_OUTPUT_BYTES = 120 * 1024

const estimateBase64ByteLength = (value) => {
  const normalized = String(value || '')
  const padding = normalized.endsWith('==') ? 2 : normalized.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding)
}

const getDataUrlByteLength = (dataUrl) => {
  const payload = String(dataUrl || '').split(',', 2)[1] || ''
  return estimateBase64ByteLength(payload)
}

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Invalid image file'))
    }
    image.src = objectUrl
  })

const exportCanvas = (canvas, mimeType, quality) => {
  const dataUrl = canvas.toDataURL(mimeType, quality)
  if (!dataUrl.startsWith(`data:${mimeType}`)) {
    return null
  }
  return dataUrl
}

const drawSquareCanvas = (image, size) => {
  const width = image.naturalWidth || image.width
  const height = image.naturalHeight || image.height
  const cropSide = Math.min(width, height)
  const offsetX = Math.max(0, (width - cropSide) / 2)
  const offsetY = Math.max(0, (height - cropSide) / 2)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Image processing is not supported in this browser')
  }

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, offsetX, offsetY, cropSide, cropSide, 0, 0, size, size)
  return canvas
}

const encodeCanvas = (canvas) => {
  const mimeCandidates = ['image/webp', 'image/jpeg']
  let bestCandidate = null

  for (const mimeType of mimeCandidates) {
    for (const quality of QUALITY_STEPS) {
      const dataUrl = exportCanvas(canvas, mimeType, quality)
      if (!dataUrl) {
        continue
      }
      const byteLength = getDataUrlByteLength(dataUrl)
      if (!bestCandidate || byteLength < bestCandidate.byteLength) {
        bestCandidate = { dataUrl, byteLength, mimeType }
      }
      if (byteLength <= MAX_OUTPUT_BYTES) {
        return { dataUrl, byteLength, mimeType }
      }
    }
  }

  return bestCandidate
}

export async function prepareProfileImageFile(file) {
  if (!(file instanceof File)) {
    throw new Error('No image file selected')
  }
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Use a JPG, PNG, or WebP image')
  }

  const image = await loadImageFromFile(file)
  let bestResult = null

  for (const size of TARGET_SIZES) {
    const canvas = drawSquareCanvas(image, size)
    const encoded = encodeCanvas(canvas)
    if (!encoded) {
      continue
    }
    if (!bestResult || encoded.byteLength < bestResult.byteLength) {
      bestResult = encoded
    }
    if (encoded.byteLength <= MAX_OUTPUT_BYTES) {
      return encoded
    }
  }

  if (!bestResult) {
    throw new Error('Could not process the selected image')
  }

  return bestResult
}
