import { useState, useEffect, useRef } from 'react';
import '../../styles/ProductSearchInput.css';

const ProductSearchInput = ({ products, onSelect, placeholder = "Search products..." }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Advanced search algorithm with fuzzy matching and relevance scoring
  const searchProducts = (query) => {
    if (!query || query.trim().length === 0) {
      setSuggestions([]);
      return;
    }

    const searchQuery = query.toLowerCase().trim();
    const searchWords = searchQuery.split(/\s+/);

    const scoredProducts = products.map(product => {
      const productName = product.name.toLowerCase();
      const productCategory = product.category?.toLowerCase() || '';
      const productGender = product.gender?.toLowerCase() || '';
      
      let score = 0;
      let matchedParts = [];

      // Exact match (highest priority)
      if (productName === searchQuery) {
        score += 1000;
        matchedParts.push({ type: 'exact', text: product.name });
      }
      
      // Starts with query (high priority)
      else if (productName.startsWith(searchQuery)) {
        score += 500;
        matchedParts.push({ type: 'startsWith', text: product.name });
      }
      
      // Contains exact phrase
      else if (productName.includes(searchQuery)) {
        score += 300;
        matchedParts.push({ type: 'contains', text: product.name });
      }
      
      // Word-by-word matching
      else {
        searchWords.forEach(word => {
          if (word.length < 2) return;
          
          // Name contains word
          if (productName.includes(word)) {
            score += 100;
            matchedParts.push({ type: 'word', text: word });
          }
          
          // Category match
          if (productCategory.includes(word)) {
            score += 50;
            matchedParts.push({ type: 'category', text: product.category });
          }
          
          // Gender match
          if (productGender.includes(word)) {
            score += 30;
            matchedParts.push({ type: 'gender', text: product.gender });
          }
          
          // Fuzzy matching (character similarity)
          const similarity = calculateSimilarity(word, productName);
          if (similarity > 0.6) {
            score += Math.floor(similarity * 50);
          }
        });
      }

      // Boost for sale items
      if (product.isOnSale) {
        score += 10;
      }

      // Boost for in-stock items
      if (product.stock > 0) {
        score += 20;
      }

      return {
        ...product,
        score,
        matchedParts,
        highlighted: highlightMatch(product.name, searchQuery)
      };
    });

    // Filter products with score > 0 and sort by score
    const filteredProducts = scoredProducts
      .filter(p => p.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8); // Show top 8 results

    setSuggestions(filteredProducts);
  };

  // Calculate string similarity (Levenshtein distance based)
  const calculateSimilarity = (str1, str2) => {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = getEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  };

  // Levenshtein distance
  const getEditDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Highlight matching parts
  const highlightMatch = (text, query) => {
    if (!query) return text;
    
    const regex = new RegExp(`(${query.split(/\s+/).filter(w => w.length > 1).join('|')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (regex.test(part)) {
        return <mark key={index} className="search-highlight">{part}</mark>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setSelectedIndex(-1);
    searchProducts(value);
    setShowSuggestions(true);
  };

  // Handle product selection
  const handleSelectProduct = (product) => {
    setSearchTerm(product.name);
    setShowSuggestions(false);
    setSuggestions([]);
    onSelect(product);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectProduct(suggestions[selectedIndex]);
        }
        break;
      
      case 'Escape':
        setShowSuggestions(false);
        break;
      
      default:
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.children[selectedIndex];
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  return (
    <div className="product-search-container">
      <div className="product-search-input-wrapper">
        <input
          ref={inputRef}
          type="text"
          className="product-search-input"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
        />
        <svg 
          className="product-search-icon" 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8"/>
          <path d="m21 21-4.35-4.35"/>
        </svg>
        {searchTerm && (
          <button
            className="product-search-clear"
            onClick={() => {
              setSearchTerm('');
              setSuggestions([]);
              setShowSuggestions(false);
              inputRef.current?.focus();
            }}
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div ref={suggestionsRef} className="product-suggestions">
          {suggestions.map((product, index) => (
            <div
              key={product.id}
              className={`product-suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelectProduct(product)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="suggestion-content">
                <div className="suggestion-name">
                  {product.highlighted}
                </div>
                <div className="suggestion-meta">
                  {product.category && (
                    <span className="suggestion-badge">{product.category}</span>
                  )}
                  {product.gender && (
                    <span className="suggestion-badge">{product.gender}</span>
                  )}
                  {product.isOnSale && (
                    <span className="suggestion-badge sale">SALE</span>
                  )}
                </div>
              </div>
              <div className="suggestion-price">
                {product.isOnSale ? (
                  <>
                    <span className="price-sale">₹{product.salePrice}</span>
                    <span className="price-original">₹{product.basePrice}</span>
                  </>
                ) : (
                  <span className="price-regular">₹{product.basePrice}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showSuggestions && searchTerm && suggestions.length === 0 && (
        <div className="product-suggestions">
          <div className="product-no-results">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <p>No products found for "{searchTerm}"</p>
            <span>Try different keywords or check spelling</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSearchInput;
