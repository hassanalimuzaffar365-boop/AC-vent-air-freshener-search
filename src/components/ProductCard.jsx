import { useState } from 'react';

// Threshold for the "Looks Genuine" vs "Not Sure" badge (Feature 4/6).
// The SRS doesn't pin an exact number, so 60/100 is used as a
// reasonable cutoff: scores at or above this look trustworthy,
// anything lower gets flagged for the person to double-check themselves.
const GENUINE_THRESHOLD = 60;

function StarRating({ rating }) {
  if (rating === null || rating === undefined) {
    return <span className="rating rating--none">No rating yet</span>;
  }
  const rounded = Math.round(rating);
  return (
    <span className="rating" title={`${rating} out of 5`}>
      {'★'.repeat(rounded)}
      {'☆'.repeat(5 - rounded)}
      <span className="rating__number">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function ProductCard({ product, source }) {
  const isGenuine = (product.genuine_score ?? 0) >= GENUINE_THRESHOLD;
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <a
      className="card"
      href={product.link}
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="card__image-wrap">
        {product.photo_url && !imageFailed ? (
          <img
            src={product.photo_url}
            alt={product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="card__image-placeholder">No image</div>
        )}
        <span className={`badge badge--${source}`}>
          {source === 'live' ? 'Live' : 'Saved'}
        </span>
      </div>

      <div className="card__body">
        <p className="card__name">{product.name}</p>
        <p className="card__source">{product.source_site}</p>

        <div className="card__meta">
          <StarRating rating={product.rating} />
          <span className="card__price">
            {product.price != null ? `$${product.price.toFixed(2)}` : 'Price unavailable'}
          </span>
        </div>

        <div className="card__footer">
          <span className={`tag ${isGenuine ? 'tag--genuine' : 'tag--unsure'}`}>
            {isGenuine ? 'Looks Genuine' : 'Not Sure'}
          </span>
          <span className="card__score" title={product.genuine_reason}>
            Trust score: {product.genuine_score ?? '—'}
          </span>
        </div>
      </div>
    </a>
  );
}
