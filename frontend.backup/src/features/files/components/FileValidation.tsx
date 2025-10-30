import React from 'react'
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { FileValidation as FileValidationType } from '@/shared/lib/types'

interface FileValidationProps {
  validation: FileValidationType
  fileName: string
  className?: string
}

export const FileValidation: React.FC<FileValidationProps> = ({
  validation,
  fileName,
  className
}) => {
  if (validation.isValid && validation.warnings.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Errors */}
      {validation.errors.map((error, index) => (
        <Alert key={`error-${index}`} variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{fileName}:</strong> {error}
          </AlertDescription>
        </Alert>
      ))}

      {/* Warnings */}
      {validation.warnings.map((warning, index) => (
        <Alert key={`warning-${index}`} className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>{fileName}:</strong> {warning}
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}

interface FileValidationSummaryProps {
  validations: Array<{ fileName: string; validation: FileValidationType }>
  className?: string
}

export const FileValidationSummary: React.FC<FileValidationSummaryProps> = ({
  validations,
  className
}) => {
  const validFiles = validations.filter(v => v.validation.isValid).length
  const filesWithWarnings = validations.filter(v =>
    v.validation.isValid && v.validation.warnings.length > 0
  ).length
  const invalidFiles = validations.filter(v => !v.validation.isValid).length

  if (validations.length === 0) return null

  return (
    <div className={cn('space-y-3', className)}>
      {/* Summary Stats */}
      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-1">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <span className="text-green-700">{validFiles} valid</span>
        </div>
        {filesWithWarnings > 0 && (
          <div className="flex items-center space-x-1">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-yellow-700">{filesWithWarnings} with warnings</span>
          </div>
        )}
        {invalidFiles > 0 && (
          <div className="flex items-center space-x-1">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <span className="text-red-700">{invalidFiles} invalid</span>
          </div>
        )}
      </div>

      {/* Individual File Validations */}
      <div className="space-y-2">
        {validations.map(({ fileName, validation }) => (
          <FileValidation
            key={fileName}
            fileName={fileName}
            validation={validation}
          />
        ))}
      </div>

      {/* Upload Recommendation */}
      {invalidFiles > 0 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Please fix the errors above before uploading. Files with warnings can still be uploaded but may cause issues.
          </AlertDescription>
        </Alert>
      )}

      {invalidFiles === 0 && filesWithWarnings > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            All files are valid and ready to upload. Review the warnings above for optimal upload experience.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// Utility function for validating multiple files
export const validateFiles = (
  files: File[],
  maxSize: number = 50, // MB
  allowedTypes: string[] = []
): Array<{ fileName: string; validation: FileValidationType }> => {
  return files.map(file => ({
    fileName: file.name,
    validation: {
      isValid: true,
      errors: [],
      warnings: []
    } as FileValidationType
  }))
}

// File type validation helpers
export const FILE_TYPE_VALIDATORS = {
  image: (file: File) => file.type.startsWith('image/'),
  video: (file: File) => file.type.startsWith('video/'),
  document: (file: File) => /\.(pdf|doc|docx|txt|rtf)$/i.test(file.name),
  audio: (file: File) => file.type.startsWith('audio/'),
  archive: (file: File) => /\.(zip|rar|7z|tar|gz)$/i.test(file.name),

  // Custom validator for any file type
  custom: (file: File, allowedTypes: string[]) => {
    if (allowedTypes.length === 0) return true
    return allowedTypes.some(type => {
      if (type.startsWith('.')) {
        return file.name.toLowerCase().endsWith(type.toLowerCase())
      }
      return file.type.match(type)
    })
  }
}

// Size validation helper
export const validateFileSize = (file: File, maxSizeMB: number = 50): boolean => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  return file.size <= maxSizeBytes
}

// Comprehensive file validation
export const createFileValidator = (options: {
  maxSize?: number
  allowedTypes?: string[]
  customValidator?: (file: File) => FileValidationType
}) => {
  return (file: File): FileValidationType => {
    const errors: string[] = []
    const warnings: string[] = []

    // Use custom validator if provided
    if (options.customValidator) {
      return options.customValidator(file)
    }

    // Size validation
    if (!validateFileSize(file, options.maxSize)) {
      errors.push(`File size must be less than ${options.maxSize || 50}MB`)
    }

    // Type validation
    if (options.allowedTypes && options.allowedTypes.length > 0) {
      const isValidType = FILE_TYPE_VALIDATORS.custom(file, options.allowedTypes)
      if (!isValidType) {
        errors.push('File type not allowed')
      }
    }

    // Warning for very large files
    if (file.size > 10 * 1024 * 1024) {
      warnings.push('Large files may take longer to upload and process')
    }

    // Warning for unusual file types
    if (!file.type && !/\.(txt|md|log)$/i.test(file.name)) {
      warnings.push('File type could not be detected')
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }
}