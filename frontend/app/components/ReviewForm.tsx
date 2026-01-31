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
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddImage = () => {
    if (imageUrl.trim()) {
      setImages([...images, imageUrl.trim()]);
      setImageUrl("");
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
      setVisitDate("");
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

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Slike (opciono)
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="URL slike..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <button
            type="button"
            onClick={handleAddImage}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Dodaj
          </button>
        </div>
        {images.length > 0 && (
          <div className="space-y-2">
            {images.map((img, index) => (
              <div key={index} className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                <img src={img} alt="" className="w-16 h-16 object-cover rounded" />
                <span className="flex-1 text-sm text-gray-600 dark:text-gray-400 truncate">{img}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  className="text-red-600 hover:text-red-800"
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
        disabled={loading}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
      >
        {loading ? "Slanje..." : "Pošalji recenziju"}
      </button>
    </form>
  );
}
