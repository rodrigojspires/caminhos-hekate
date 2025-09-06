"use client"

import { useState } from "react"
import { Download, Eye, Calendar, Award, Star } from "lucide-react"
import Image from "next/image"

interface Certificate {
  id: string
  title: string
  courseName: string
  completedAt: string
  score: number
  certificateUrl: string
  thumbnailUrl: string
  instructor: string
  duration: string
}

interface CertificateGalleryProps {
  certificates: Certificate[]
  loading?: boolean
}

export default function CertificateGallery({ certificates, loading = false }: CertificateGalleryProps) {
  const [selectedCertificate, setSelectedCertificate] = useState<Certificate | null>(null)

  const handleDownload = (certificate: Certificate) => {
    // Simular download
    const link = document.createElement('a')
    link.href = certificate.certificateUrl
    link.download = `${certificate.title}.pdf`
    link.click()
  }

  const handleView = (certificate: Certificate) => {
    setSelectedCertificate(certificate)
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border overflow-hidden animate-pulse">
            <div className="h-48 bg-gray-200"></div>
            <div className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-4 w-3/4"></div>
              <div className="flex justify-between items-center">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (certificates.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum certificado encontrado</h3>
        <p className="text-gray-500">Complete cursos para ganhar certificados e exibi-los aqui.</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.map((certificate) => (
          <div key={certificate.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
            {/* Certificate Thumbnail */}
            <div className="relative h-48 bg-gradient-to-br from-purple-500 to-blue-600">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Award className="w-12 h-12 mx-auto mb-2" />
                  <h3 className="font-bold text-lg">{certificate.title}</h3>
                  <p className="text-sm opacity-90">{certificate.courseName}</p>
                </div>
              </div>
              <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1">
                <div className="flex items-center text-white text-sm">
                  <Star className="w-4 h-4 mr-1 fill-current" />
                  {certificate.score}%
                </div>
              </div>
            </div>

            {/* Certificate Info */}
            <div className="p-6">
              <div className="flex items-center text-sm text-gray-500 mb-3">
                <Calendar className="w-4 h-4 mr-1" />
                {new Date(certificate.completedAt).toLocaleDateString('pt-BR')}
              </div>
              
              <div className="text-sm text-gray-600 mb-4">
                <p><strong>Instrutor:</strong> {certificate.instructor}</p>
                <p><strong>Duração:</strong> {certificate.duration}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleView(certificate)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar
                </button>
                <button
                  onClick={() => handleDownload(certificate)}
                  className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Certificate Modal */}
      {selectedCertificate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">{selectedCertificate.title}</h2>
                <button
                  onClick={() => setSelectedCertificate(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              {/* Certificate Preview */}
              <div className="bg-gradient-to-br from-purple-500 to-blue-600 text-white p-12 rounded-lg text-center">
                <Award className="w-20 h-20 mx-auto mb-6" />
                <h1 className="text-3xl font-bold mb-4">Certificado de Conclusão</h1>
                <p className="text-xl mb-6">Este certificado é concedido a</p>
                <h2 className="text-2xl font-bold mb-6 border-b-2 border-white/30 pb-2 inline-block">João Silva</h2>
                <p className="text-lg mb-4">pela conclusão bem-sucedida do curso</p>
                <h3 className="text-xl font-bold mb-6">{selectedCertificate.courseName}</h3>
                <div className="flex justify-between items-end mt-12">
                  <div>
                    <p className="text-sm">Data de Conclusão</p>
                    <p className="font-bold">{new Date(selectedCertificate.completedAt).toLocaleDateString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-sm">Pontuação</p>
                    <p className="font-bold">{selectedCertificate.score}%</p>
                  </div>
                  <div>
                    <p className="text-sm">Instrutor</p>
                    <p className="font-bold">{selectedCertificate.instructor}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-4 mt-6">
                <button
                  onClick={() => handleDownload(selectedCertificate)}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  Baixar Certificado
                </button>
                <button
                  onClick={() => setSelectedCertificate(null)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}