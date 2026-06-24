import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { ChoreIcon, CalendarIcon, AdminIcon, LogoutIcon } from './icons';

export default function Navbar() {
    const { isAdmin, logout } = useAuth();
    const navigate = useNavigate();

    return (
        <nav className="navbar">
            <div className="navbar-inner">
                <NavLink to="/" className="navbar-logo">
                    <div className="navbar-logo-icon"><ChoreIcon size={22} weight="fill" /></div>
                    <div className="navbar-logo-text">
                        Alter<span>Net</span> Chore
                    </div>
                </NavLink>

                <div className="navbar-links">
                    <NavLink to="/" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`} end>
                        {({ isActive }) => (
                            <>
                                <span className="navbar-link-label"><CalendarIcon size={18} weight={isActive ? 'fill' : 'regular'} /> Takvim</span>
                                {isActive && (
                                    <motion.div
                                        className="navbar-link-indicator"
                                        layoutId="nav-indicator"
                                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                    {isAdmin && (
                        <NavLink to="/admin" className={({ isActive }) => `navbar-link ${isActive ? 'active' : ''}`}>
                            {({ isActive }) => (
                                <>
                                    <span className="navbar-link-label"><AdminIcon size={18} weight={isActive ? 'fill' : 'regular'} /> Yönetim</span>
                                    {isActive && (
                                        <motion.div
                                            className="navbar-link-indicator"
                                            layoutId="nav-indicator"
                                            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                                        />
                                    )}
                                </>
                            )}
                        </NavLink>
                    )}
                </div>

                <div className="navbar-actions">
                    {isAdmin ? (
                        <button
                            className="btn btn-ghost btn-sm btn-icon"
                            onClick={() => { logout(); navigate('/'); }}
                        >
                            <LogoutIcon size={16} weight="bold" /> Çıkış Yap
                        </button>
                    ) : (
                        <NavLink to="/login" className="btn btn-primary btn-sm">
                            Giriş Yap
                        </NavLink>
                    )}
                </div>
            </div>
        </nav>
    );
}
