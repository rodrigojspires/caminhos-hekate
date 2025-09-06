'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, Upload, Image as ImageIcon, Move } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import {
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface ProductImageUploadProps {
  images: string[]
  onImagesChange: (images: string[]) => void
  maxImages?: number
  maxFileSize?: number // em MB
}

interface SortableImageItemProps {
  id: string
  image: string
  index: number
  onRemove: (index: number) => void
}

function SortableImageItem({ id, image, index, onRemove }: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group"
    >
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="relative aspect-square">
            <Image
              src={image}
              alt={`Produto ${index + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            
            {/* Overlay com controles */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  className="cursor-move"
                  {...attributes}
                  {...listeners}
                  aria-label={`Reordenar imagem ${index + 1}`}
                  title={`Reordenar imagem ${index + 1}`}
                >
                  <Move className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onRemove(index)}
                  aria-label={`Remover imagem ${index + 1}`}
                  title={`Remover imagem ${index + 1}`}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Badge de posição */}
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {index === 0 ? 'Principal' : `${index + 1}`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ProductImageUpload({
  images,
  onImagesChange,
  maxImages = 5,
  maxFileSize = 5 // 5MB
}: ProductImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > maxImages) {
      toast.error(`Máximo de ${maxImages} imagens permitidas`)
      return
    }

    setIsUploading(true)
    
    try {
      const uploadPromises = acceptedFiles.map(async (file) => {
        // Validar tamanho do arquivo
        if (file.size > maxFileSize * 1024 * 1024) {
          throw new Error(`Arquivo ${file.name} é muito grande. Máximo ${maxFileSize}MB.`)
        }

        // Criar FormData para upload
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'product')

        // Fazer upload
        const response = await fetch('/api/admin/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.message || 'Erro no upload')
        }

        const data = await response.json()
        return data.url
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      onImagesChange([...images, ...uploadedUrls])
      toast.success(`${uploadedUrls.length} imagem(ns) enviada(s) com sucesso!`)
    } catch (error) {
      console.error('Erro no upload:', error)
      toast.error(error instanceof Error ? error.message : 'Erro no upload das imagens')
    } finally {
      setIsUploading(false)
    }
  }, [images, onImagesChange, maxImages, maxFileSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    multiple: true,
    disabled: isUploading || images.length >= maxImages
  })

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
    toast.success('Imagem removida')
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((_, index) => `image-${index}` === active.id)
      const newIndex = images.findIndex((_, index) => `image-${index}` === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newImages = arrayMove(images, oldIndex, newIndex)
        onImagesChange(newImages)
      }
    }
  }

  return (
    <div className="space-y-4">
      {/* Área de Upload */}
      {images.length < maxImages && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
            ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-primary/5'}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center space-y-2">
            {isUploading ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-sm text-muted-foreground">
              {isUploading ? (
                'Enviando imagens...'
              ) : isDragActive ? (
                'Solte as imagens aqui'
              ) : (
                <>
                  Arraste imagens aqui ou <span className="text-primary">clique para selecionar</span>
                  <br />
                  <span className="text-xs">
                    Máximo {maxImages} imagens • JPG, PNG, WebP • Até {maxFileSize}MB cada
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Lista de Imagens */}
      {images.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              Imagens do Produto ({images.length}/{maxImages})
            </h4>
            <p className="text-xs text-muted-foreground">
              Arraste para reordenar • A primeira imagem será a principal
            </p>
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={images.map((_, index) => `image-${index}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {images.map((image, index) => (
                  <SortableImageItem
                    key={`image-${index}`}
                    id={`image-${index}`}
                    image={image}
                    index={index}
                    onRemove={removeImage}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Estado vazio */}
      {images.length === 0 && (
        <div className="text-center py-8">
          <ImageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">
            Nenhuma imagem adicionada ainda
          </p>
        </div>
      )}
    </div>
  )
}
