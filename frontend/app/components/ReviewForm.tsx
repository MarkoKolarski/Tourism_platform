import { useState } from "react";
import { useAuth } from "../context/AuthContext";

interface ReviewFormProps {
  tourId: number;
  onSuccess?: () => void;
}

export default function ReviewForm({ tourId, onSuccess }: ReviewFormProps) {
  const { token } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0]);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      setError(null);

      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError(`Slika ${file.name} je prevelika. Maksimalna veličina je 10MB.`);
          continue;
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError(`Fajl ${file.name} nije slika.`);
          continue;
        }

        const formData = new FormData();
        formData.append('image', file);

        const response = await fetch('/api/tours-service/images/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (response.ok) {
          const data = await response.json();
          uploadedUrls.push(data.url);
        } else {
          setError(`Greška pri upload-u slike ${file.name}`);
        }
      }

      if (uploadedUrls.length > 0) {
        setImages([...images, ...uploadedUrls]);
      }
    } catch (err) {
      setError("Greška pri upload-u slika");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!visitDate) {
      setError("Molimo unesite datum posete");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/tours-service/tours/${tourId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          rating,
          comment,
          visit_date: visitDate,
          images
        })
      });

      if (!response.ok) {
        throw new Error("Failed to submit review");
      }

      // Reset form
      setRating(5);
      setComment("");
      setVisitDate(new Date().toISOString().split('T')[0]);
      setImages([]);
      setError(null);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError("Greška pri slanju recenzije. Pokušajte ponovo.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
        Ostavite svoju recenziju
      </h3>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Ocena *
        </label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`text-3xl ${star <= rating ? "text-yellow-500" : "text-gray-300 dark:text-gray-600"}`}
            >
              ★
            </button>
          ))}
          <span className="ml-2 text-gray-600 dark:text-gray-400">
            {rating}/5
          </span>
        </div>
      </div>

      {/* Visit Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Datum posete *
        </label>
        <input
          type="date"
          value={visitDate}
          onChange={(e) => setVisitDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          required
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Vaš komentar *
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          required
          rows={5}
          placeholder="Opišite svoje iskustvo na turi..."
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* Images - File Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Slike (opciono)
        </label>
        <div className="mb-2">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200"
          />
          {uploading && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
              Upload u toku...
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Maksimalna veličina po slici: 10MB. Podržani formati: JPG, PNG, GIF, WebP
          </p>
        </div>
        {images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {images.map((img, index) => (
              <div key={index} className="relative group">
                <img 
                  src={img} 
                  alt={`Upload ${index + 1}`} 
                  className="w-full h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={loading || uploading}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
      >
        {loading ? "Slanje..." : "Pošalji recenziju"}
      </button>
    </form>
  );
}
