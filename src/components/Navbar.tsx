import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Search, Menu, X, Heart, User } from 'lucide-react';

interface NavbarProps {
  cartCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ cartCount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const categories = [
    { name: 'All Products', path: '/category/all' },
    { name: 'Sarees', path: '/category/sarees' },
    { name: 'Kurtis', path: '/category/kurtis' },
    { name: 'Dresses', path: '/category/dresses' },
    { name: 'Lehengas', path: '/category/lehengas' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/category/all?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-xs">
      {/* టాప్ అనౌన్స్‌మెంట్ బార్ */}
      <div className="bg-rose-600 text-white text-xs py-1.5 px-4 text-center font-medium tracking-wide">
        Free Shipping on Orders Above ₹999 | Use Code: KASHVI10 for 10% Off
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 text-gray-700 hover:text-rose-600 focus:outline-hidden"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link to="/" className="flex flex-col">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-700 font-serif">
                KASHVI
              </span>
              <span className="text-[10px] tracking-[0.3em] uppercase text-gray-500 font-sans -mt-1">
                FASHIONS
              </span>
            </Link>
          </div>

          <nav className="hidden lg:flex items-center space-x-8">
            <Link to="/" className="text-sm font-semibold text-gray-800 hover:text-rose-600 transition-colors">
              Home
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={cat.path}
                className="text-sm font-semibold text-gray-700 hover:text-rose-600 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          <div className="flex items-center space-x-3 sm:space-x-5">
            <form onSubmit={handleSearch} className="hidden md:flex items-center relative">
              <input
                type="text"
                placeholder="Search sarees, kurtis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 lg:w-64 pl-9 pr-4 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-hidden focus:border-rose-500 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
            </form>

            <Link to="/category/all" className="p-2 text-gray-700 hover:text-rose-600 transition-colors">
              <Heart className="w-5 h-5" />
            </Link>

            <Link to="/cart" className="p-2 text-gray-700 hover:text-rose-600 relative transition-colors">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold text-white bg-rose-600 rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* మొబైల్ డ్రాయర్ */}
      {isOpen && (
        <div className="lg:hidden bg-white border-b border-rose-100 px-4 pt-3 pb-5 space-y-3">
          <form onSubmit={handleSearch} className="flex items-center relative mb-3">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden focus:border-rose-500"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3" />
          </form>
          <Link
            to="/"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-base font-medium text-gray-800 border-b border-gray-50"
          >
            Home
          </Link>
          {categories.map((cat) => (
            <Link
              key={cat.name}
              to={cat.path}
              onClick={() => setIsOpen(false)}
              className="block py-2 text-base font-medium text-gray-700 border-b border-gray-50 hover:text-rose-600"
            >
              {cat.name}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
};