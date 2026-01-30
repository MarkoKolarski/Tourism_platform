interface Review {
  id: number;
  tourist_id: number;
  rating: number;
  comment: string;
  visit_date: string;
  images: string[];
  created_at: string;
}

interface ReviewListProps {
  reviews: Review[];
}

export default function ReviewList({ reviews }: ReviewListProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sr-RS", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  const renderStars = (rating: number) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        Još nema recenzija za ovu turu. Budite prvi koji će ostaviti recenziju!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div key={review.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-yellow-500 text-xl">
                  {renderStars(review.rating)}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {review.rating}/5
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Turista ID: {review.tourist_id}
              </div>
            </div>
            <div className="text-right text-sm text-gray-500 dark:text-gray-400">
              <div>Posetio: {formatDate(review.visit_date)}</div>
              <div>Recenzija: {formatDate(review.created_at)}</div>
            </div>
          </div>

          {/* Comment */}
          <p className="text-gray-700 dark:text-gray-300 mb-4 whitespace-pre-line">
            {review.comment}
          </p>

          {/* Images */}
          {review.images && review.images.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {review.images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Review image ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
