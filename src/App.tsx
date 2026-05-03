/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  doc, 
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { auth, db, signInWithGoogle, handleFirestoreError, OperationType } from "./lib/firebase";
import { 
  Star, 
  MapPin, 
  Shield, 
  CheckCircle, 
  ExternalLink, 
  MessageSquare, 
  Menu,
  User,
  ArrowRight,
  Search,
  Zap,
  Lock,
  Globe,
  Moon,
  Sun,
  Camera,
  Image as ImageIcon,
  Clock,
  Briefcase,
  Wallet,
  CreditCard,
  AlertCircle,
  X,
  Instagram,
  Facebook,
  Youtube,
  Linkedin,
  Github,
  Monitor,
  Palette,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  History,
  QrCode,
  Coins,
  FileCheck,
  Upload
} from "lucide-react";

// --- Types ---

interface Professional {
  id: string;
  name: string;
  title: string;
  category: string;
  rating: string;
  rate: string;
  skills: string[];
  avatar: string;
  bio: string;
  projectsCount: number;
  completionRate: string;
  chargingModel: 'milestones' | 'hourly' | 'retainer';
  visitType: 'Técnica' | 'Consultoria' | 'Auditoria';
  visitPrice: number;
  milestones?: { title: string; percentage: number; price?: number }[];
  socials?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    linkedin?: string;
    github?: string;
    website?: string;
    behance?: string;
    pinterest?: string;
  };
}

interface ProjectCardProps {
  key?: React.Key;
  title: string;
  category: string;
  image: string;
  isEscrow: boolean;
}

interface ReviewCardProps {
  key?: React.Key;
  name: string;
  date: string;
  rating: number;
  comment: string;
  avatar: string;
}

// --- Shared Components ---

const PaymentModal = ({ 
  isOpen, 
  onClose, 
  amount, 
  walletBalance, 
  onConfirm 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  amount: number; 
  walletBalance: number;
  onConfirm: (method: 'wallet' | 'deposit') => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-0">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-sapphire/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-card-bg w-full max-w-md rounded-[32px] shadow-2xl relative z-10 overflow-hidden border border-border-subtle"
      >
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-sapphire">Pagar e Iniciar Escrow</h2>
            <button onClick={onClose} className="text-text-muted hover:text-sapphire p-1 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="bg-bg-base/50 p-6 rounded-2xl border border-border-subtle mb-8">
            <p className="text-[10px] uppercase font-bold text-text-muted tracking-widest mb-1">Valor Total</p>
            <p className="text-3xl font-extrabold text-sapphire">R$ {amount.toFixed(2)}</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => onConfirm('wallet')}
              className="w-full group p-4 rounded-2xl border border-border-subtle bg-bg-base hover:border-sapphire hover:bg-sapphire/5 transition-all text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-sapphire/10 rounded-xl flex items-center justify-center group-hover:bg-sapphire group-hover:text-white transition-all">
                <Wallet size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sapphire text-[13px]">Usar Saldo da Carteira</p>
                <p className="text-[11px] text-text-muted tracking-tight">Saldo disponível: R$ {walletBalance.toFixed(2)}</p>
              </div>
              <ArrowRight size={16} className="text-text-muted group-hover:text-sapphire" />
            </button>

            <button 
              onClick={() => onConfirm('deposit')}
              className="w-full group p-4 rounded-2xl border border-border-subtle bg-bg-base hover:border-sapphire hover:bg-gold/10 transition-all text-left flex items-center gap-4"
            >
              <div className="w-12 h-12 bg-gold/10 rounded-xl flex items-center justify-center group-hover:bg-gold group-hover:text-sapphire transition-all">
                <CreditCard size={20} />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sapphire text-[13px]">Depositar e Pagar (Pix/Card)</p>
                <p className="text-[11px] text-text-muted tracking-tight">O valor será adicionado e já travado no Escrow.</p>
              </div>
              <ArrowRight size={16} className="text-text-muted group-hover:text-gold" />
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-border-subtle flex gap-3">
            <AlertCircle size={16} className="text-gold shrink-0 mt-0.5" />
            <p className="text-[10px] text-text-muted leading-relaxed italic">
              Seu saldo ficará travado em nome deste serviço. Se o prestador não aceitar em 24h, o valor é automaticamente destravado para sua conta.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

type ViewType = 'home' | 'profile' | 'how-it-works' | 'search-results' | 'security' | 'propose-contract' | 'register' | 'dashboard' | 'setup-profile';

const Header = ({ 
  onViewChange, 
  currentView, 
  isDark, 
  onToggleDark,
  isLoggedIn,
  user
}: { 
  onViewChange: (view: ViewType) => void, 
  currentView: ViewType, 
  isDark: boolean, 
  onToggleDark: () => void,
  isLoggedIn: boolean,
  user?: { name: string, initials: string }
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleNav = (view: ViewType) => {
    onViewChange(view);
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 h-[64px] bg-card-bg border-b border-border-subtle px-6 md:px-10 flex justify-between items-center transition-colors duration-300">
      <div className="flex items-center gap-2 cursor-pointer" onClick={() => handleNav('home')}>
        <div className="w-6 h-6 bg-gold rounded-full" />
        <span className="text-xl font-extrabold tracking-tight text-sapphire">SOL-jobs</span>
      </div>
      
      <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-text-muted">
        <button 
          onClick={() => handleNav('home')}
          className={`hover:text-sapphire transition-colors ${currentView === 'home' ? 'text-sapphire' : ''}`}
        >
          Explorar
        </button>
        <button 
          onClick={() => handleNav('how-it-works')}
          className={`hover:text-sapphire transition-colors ${currentView === 'how-it-works' ? 'text-sapphire' : ''}`}
        >
          Como Funciona
        </button>
        <button 
          onClick={() => handleNav('security')}
          className={`hover:text-sapphire transition-colors ${currentView === 'security' ? 'text-sapphire' : ''}`}
        >
          Segurança
        </button>
        <a href="#" className="hover:text-sapphire transition-colors">Suporte</a>
      </nav>

      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={onToggleDark}
          className="p-2 rounded-lg hover:bg-bg-base transition-colors text-text-muted"
          title={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
        
        <div className="hidden sm:block h-6 w-[1px] bg-border-subtle" />

        {isLoggedIn && user ? (
          <button 
            onClick={() => handleNav('dashboard')}
            className="flex items-center gap-3 group hover:bg-bg-base p-1.5 pr-1 md:pr-3 rounded-full transition-all"
          >
            <div className="w-8 h-8 bg-sapphire text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg shadow-sapphire/20">
              {user.initials}
            </div>
            <span className="text-sm font-bold text-sapphire hidden md:inline">{user.name}</span>
          </button>
        ) : (
          <button 
            onClick={() => handleNav('register')}
            className="hidden sm:flex bg-sapphire text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-sapphire/20 transition-all hover:scale-105"
          >
            Entrar
          </button>
        )}

        {/* Mobile Menu Button */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden p-2 text-sapphire"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-[64px] left-0 w-full bg-card-bg border-b border-border-subtle shadow-xl p-6 flex flex-col gap-6 md:hidden z-[60]"
          >
            <nav className="flex flex-col gap-4 text-base font-bold text-sapphire">
              <button 
                onClick={() => handleNav('home')}
                className="text-left py-2 border-b border-border-subtle flex justify-between items-center"
              >
                Explorar <ArrowRight size={16} />
              </button>
              <button 
                onClick={() => handleNav('how-it-works')}
                className="text-left py-2 border-b border-border-subtle flex justify-between items-center"
              >
                Como Funciona <ArrowRight size={16} />
              </button>
              <button 
                onClick={() => handleNav('security')}
                className="text-left py-2 border-b border-border-subtle flex justify-between items-center"
              >
                Segurança <ArrowRight size={16} />
              </button>
              {!isLoggedIn && (
                 <button 
                  onClick={() => handleNav('register')}
                  className="bg-sapphire text-white w-full py-4 rounded-2xl font-bold mt-4 shadow-xl shadow-sapphire/20"
                >
                  Entrar ou Criar Conta
                </button>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const Badge = ({ children, icon: Icon, variant }: { children: React.ReactNode, icon?: any, variant?: 'gold' | 'verified' }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-card-bg text-[11px] font-bold rounded-md border border-border-subtle ${
    variant === 'gold' ? 'text-gold' : variant === 'verified' ? 'text-success' : 'text-text-main'
  }`}>
    {Icon && <Icon size={12} />}
    {children}
  </span>
);

const ProjectCard = ({ title, category, image, isEscrow }: ProjectCardProps) => (
  <motion.div 
    whileHover={{ y: -2 }}
    className="bg-card-bg rounded-lg overflow-hidden border border-border-subtle group cursor-pointer"
  >
    <div className="h-[130px] overflow-hidden relative bg-bg-base">
      <img 
        src={image} 
        alt={title} 
        referrerPolicy="no-referrer"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute bottom-2 left-2">
        {isEscrow ? (
          <div className="bg-sapphire border border-gold text-white text-[9px] font-bold px-2 py-1 rounded-[4px] flex items-center gap-1 uppercase tracking-wider">
            ✓ Contrato SOL-jobs
          </div>
        ) : (
          <div className="bg-black/60 text-white text-[9px] font-bold px-2 py-1 rounded-[4px] flex items-center gap-1 uppercase tracking-wider">
            Portfólio Externo
          </div>
        )}
      </div>
    </div>
    <div className="p-3">
      <h3 className="text-[13px] font-bold text-text-main mb-1 truncate">{title}</h3>
      <p className="text-[11px] text-text-muted line-clamp-1">{category}</p>
    </div>
  </motion.div>
);

const ReviewCard = ({ name, date, rating, comment, avatar }: ReviewCardProps) => (
  <div className="bg-card-bg/60 p-3 rounded-lg border border-border-subtle flex gap-3 transition-colors duration-300">
    <img 
      src={avatar} 
      alt={name} 
      referrerPolicy="no-referrer"
      className="w-8 h-8 rounded-full object-cover shrink-0"
    />
    <div className="flex flex-col gap-1">
      <h5 className="text-[12px] font-bold text-text-main">{name}</h5>
      <div className="flex items-center gap-0.5 text-gold text-[10px]">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={10} fill={i < Math.floor(rating) ? "currentColor" : "none"} strokeWidth={i < Math.floor(rating) ? 0 : 2} />
        ))}
      </div>
      <p className="text-[11px] text-text-muted leading-relaxed">
        "{comment}"
      </p>
    </div>
  </div>
);

// --- Sub-Views ---

const HomePage = ({ onProfessionalSelect, onSearch }: { onProfessionalSelect: (id: string) => void, onSearch: () => void }) => {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="bg-card-bg border-b border-border-subtle py-12 md:py-20 px-6 md:px-10 relative overflow-hidden transition-colors duration-300">
        <div className="max-w-4xl mx-auto flex flex-col items-center text-center relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mb-6 px-4 py-1 bg-bg-base rounded-full border border-border-subtle"
          >
            <Shield size={14} className="text-gold" />
            <span className="text-[9px] md:text-[10px] uppercase tracking-widest font-bold text-text-muted">Trabalho global via Blockchain</span>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-6xl font-extrabold text-sapphire leading-tight mb-6 md:mb-8 tracking-tight"
          >
            Conecte-se com o <br className="hidden md:block" />
            <span className="text-gold">futuro do trabalho.</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-base md:text-lg text-text-muted max-w-2xl mb-8 md:mb-12 font-medium"
          >
            Contrate especialistas verificados ou ofereça seus serviços globalmente. 
            Contratos protegidos por Escrow, pagamentos rápidos com Pix ou Crypto.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="w-full max-w-xl bg-card-bg p-2 rounded-2xl shadow-2xl flex flex-col md:flex-row gap-2 border border-border-subtle"
          >
            <div className="flex-1 flex items-center px-4 gap-3 border-b md:border-b-0 md:border-r border-border-subtle">
              <Search size={20} className="text-text-muted shrink-0" />
              <input 
                type="text" 
                placeholder="Ex: Designer, Desenvolvedor..." 
                className="w-full py-4 text-sm focus:outline-none bg-transparent text-text-main"
              />
            </div>
            <button 
              onClick={onSearch}
              className="bg-sapphire text-white px-8 py-4 rounded-xl font-bold text-sm hover:bg-sapphire/90 transition-all shadow-lg shadow-sapphire/20 active:scale-95"
            >
              Buscar Talentos
            </button>
          </motion.div>
        </div>

        {/* Decorative Grid Icons */}
        <div className="absolute top-20 right-20 opacity-10 pointer-events-none hidden lg:block text-text-muted">
          <Globe size={300} strokeWidth={1} />
        </div>
      </section>

      {/* Categories & Trust */}
      <section className="py-12 md:py-16 px-6 md:px-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 mb-12 md:mb-20">
          <div className="flex flex-col items-center text-center p-6 md:p-8 bg-card-bg rounded-3xl border border-border-subtle shadow-sm">
            <div className="w-12 h-12 bg-sapphire/5 rounded-2xl flex items-center justify-center mb-6">
              <Lock size={24} className="text-sapphire" />
            </div>
            <h3 className="font-bold text-sapphire mb-3">Escrow Seguro</h3>
            <p className="text-xs md:text-sm text-text-muted leading-relaxed tracking-tight">Liberação protegida: pague o valor total ao final ou em etapas (20%, 30%, 50%) conforme o progresso.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 md:p-8 bg-card-bg rounded-3xl border border-border-subtle shadow-sm">
            <div className="w-12 h-12 bg-gold/5 rounded-2xl flex items-center justify-center mb-6">
              <Zap size={24} className="text-gold" />
            </div>
            <h3 className="font-bold text-sapphire mb-3">Pagamento Híbrido</h3>
            <p className="text-xs md:text-sm text-text-muted leading-relaxed tracking-tight">Pagamentos rápidos com moeda local ou Crypto. Aceitamos Pix, SOL e USDC. O futuro é Multichain.</p>
          </div>
          <div className="flex flex-col items-center text-center p-6 md:p-8 bg-card-bg rounded-3xl border border-border-subtle shadow-sm">
            <div className="w-12 h-12 bg-success/5 rounded-2xl flex items-center justify-center mb-6">
              <CheckCircle size={24} className="text-success" />
            </div>
            <h3 className="font-bold text-sapphire mb-3">Qualificação Técnica</h3>
            <p className="text-xs md:text-sm text-text-muted leading-relaxed tracking-tight">Profissionais validados por Portfólio, Identidade e histórico de reputação em nossa rede.</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-sapphire">Profissionais em Destaque</h2>
          <button className="text-sm font-bold text-sapphire hover:underline">Ver todos</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Featured Professional Card 1 */}
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => onProfessionalSelect('mariana')}
            className="bg-card-bg p-6 rounded-3xl border border-border-subtle shadow-sm cursor-pointer group"
          >
            <div className="flex items-center gap-4 mb-6">
              <img 
                src="https://picsum.photos/seed/arch-woman/400/400" 
                alt="Mariana Silva" 
                className="w-16 h-16 rounded-2xl object-cover"
              />
              <div>
                <h4 className="font-bold text-sapphire group-hover:text-gold transition-colors">Mariana Silva</h4>
                <p className="text-xs text-text-muted">Design de Interiores • Rio de Janeiro</p>
              </div>
            </div>
            <div className="flex gap-2 mb-6">
              <span className="bg-gold/10 text-gold text-[9px] font-bold px-2 py-1 rounded">⭐ 4.9</span>
              <span className="bg-bg-base text-text-muted text-[9px] font-bold px-2 py-1 rounded">Interiores</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square bg-bg-base rounded-lg overflow-hidden">
                <img src="https://picsum.photos/seed/p1/200/200" className="w-full h-full object-cover" />
              </div>
              <div className="aspect-square bg-bg-base rounded-lg overflow-hidden">
                <img src="https://picsum.photos/seed/p2/200/200" className="w-full h-full object-cover" />
              </div>
              <div className="aspect-square bg-bg-base rounded-lg overflow-hidden">
                <img src="https://picsum.photos/seed/p3/200/200" className="w-full h-full object-cover" />
              </div>
            </div>
          </motion.div>

          {/* Featured Professional Card 2 */}
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => onProfessionalSelect('lucas')}
            className="bg-card-bg p-6 rounded-3xl border border-border-subtle shadow-sm cursor-pointer group"
          >
            <div className="flex items-center gap-4 mb-6">
              <img 
                src="https://picsum.photos/seed/dev-man/400/400" 
                alt="Lucas Oliveira" 
                className="w-16 h-16 rounded-2xl object-cover"
              />
              <div>
                <h4 className="font-bold text-sapphire group-hover:text-gold transition-colors">Lucas Oliveira</h4>
                <p className="text-xs text-text-muted">Desenvolvedor Fullstack • São Paulo</p>
              </div>
            </div>
            <div className="flex gap-2 mb-6">
              <span className="bg-gold/10 text-gold text-[9px] font-bold px-2 py-1 rounded">⭐ 5.0</span>
              <span className="bg-bg-base text-text-muted text-[9px] font-bold px-2 py-1 rounded">Web App</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="aspect-square bg-sapphire/10 rounded-lg flex items-center justify-center">
                <Zap size={16} className="text-sapphire" />
              </div>
              <div className="aspect-square bg-sapphire/10 rounded-lg flex items-center justify-center">
                <Lock size={16} className="text-sapphire" />
              </div>
              <div className="aspect-square bg-sapphire/10 rounded-lg flex items-center justify-center">
                <Globe size={16} className="text-sapphire" />
              </div>
            </div>
          </motion.div>

          {/* Featured Professional Card 3 */}
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => onProfessionalSelect('ana')}
            className="bg-card-bg p-6 rounded-3xl border border-border-subtle shadow-sm cursor-pointer group"
          >
            <div className="flex items-center gap-4 mb-6">
              <img 
                src="https://picsum.photos/seed/write-woman/400/400" 
                alt="Ana Costa" 
                className="w-16 h-16 rounded-2xl object-cover"
              />
              <div>
                <h4 className="font-bold text-sapphire group-hover:text-gold transition-colors">Ana Costa</h4>
                <p className="text-xs text-text-muted">Marketing Digital • Curitiba</p>
              </div>
            </div>
            <div className="flex gap-2 mb-6">
              <span className="bg-gold/10 text-gold text-[9px] font-bold px-2 py-1 rounded">⭐ 4.8</span>
              <span className="bg-bg-base text-text-muted text-[9px] font-bold px-2 py-1 rounded">Copywriting</span>
            </div>
            <div className="grid grid-cols-3 gap-2 opacity-40">
              <div className="h-2 bg-text-muted/20 rounded w-full"></div>
              <div className="h-2 bg-text-muted/20 rounded w-full"></div>
              <div className="h-2 bg-text-muted/20 rounded w-full"></div>
              <div className="h-2 bg-text-muted/20 rounded w-full"></div>
              <div className="h-2 bg-text-muted/20 rounded w-full"></div>
              <div className="h-2 bg-text-muted/20 rounded w-full"></div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

const ProfilePage = ({ prof, onProposeContract }: { prof: Professional, onProposeContract: () => void }) => {
  const projects = [
    { title: "Dashboard Corporativo", category: "Fintech • SP", image: "https://picsum.photos/seed/dev1/600/400", isEscrow: true },
    { title: "Landing Page High-End", category: "Imobiliário • Curitiba", image: "https://picsum.photos/seed/dev2/600/400", isEscrow: true },
    { title: "Campanha Black Friday", category: "E-commerce • Global", image: "https://picsum.photos/seed/mkt1/600/400", isEscrow: true },
    { title: "SEO Strategy Portfolio", category: "SaaS • Remote", image: "https://picsum.photos/seed/mkt2/600/400", isEscrow: false },
    { title: "Cozinha Funcional", category: "Design • Niterói", image: "https://picsum.photos/seed/kitchen/600/400", isEscrow: true },
    { title: "Suíte Master Tropical", category: "Decoração • Búzios", image: "https://picsum.photos/seed/suite/600/400", isEscrow: false },
  ];

  const reviews = [
    { name: "Carlos A.", date: "15 Set 2025", rating: 5, comment: "Excelente profissional. Entrega ágil e de alta qualidade.", avatar: "https://picsum.photos/seed/man1/100/100" },
    { name: "Beatriz M.", date: "02 Ago 2025", rating: 4.8, comment: "Muito atenciosa e criativa. Recomendo!", avatar: "https://picsum.photos/seed/woman2/100/100" },
    { name: "Ricardo L.", date: "10 Jul 2025", rating: 5, comment: "O sistema de escrow me deu muita segurança. Profissional 10!", avatar: "https://picsum.photos/seed/man2/100/100" },
  ];

  return (
    <main className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12 transition-colors duration-300">
      {/* Profile Hero Section */}
      <section className="mb-10 grid grid-cols-1 lg:grid-cols-[180px_1fr_280px] gap-10 items-start">
        <div className="relative">
          <img 
            src={prof.avatar} 
            alt={prof.name} 
            referrerPolicy="no-referrer"
            className="w-[180px] h-[180px] rounded-xl object-cover shadow-[0_4px_15px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_15px_rgba(0,0,0,0.4)] border-4 border-card-bg mx-auto lg:mx-0 transition-all"
          />
        </div>

        <div className="text-center lg:text-left">
          <h1 className="text-[28px] font-bold text-sapphire mb-1 tracking-tight">{prof.name}</h1>
          <h2 className="text-base font-normal text-text-muted mb-4">{prof.title}</h2>
          
          <div className="flex flex-wrap justify-center lg:justify-start gap-3 mb-5">
            <Badge variant="gold">⭐ {prof.rating} ({prof.projectsCount} Avaliações)</Badge>
            <Badge variant="verified" icon={Shield}>Identidade Verificada</Badge>
            <Badge>{prof.completionRate} Taxa de Conclusão</Badge>
          </div>

          <p className="text-sm leading-relaxed text-text-main max-w-[500px] mx-auto lg:mx-0">
            {prof.bio}
          </p>

          <div className="flex justify-center lg:justify-start gap-4 mt-6">
            {prof.socials?.linkedin && (
              <a href={prof.socials.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 bg-sapphire/5 rounded-full text-sapphire hover:bg-gold hover:text-sapphire transition-all shadow-sm">
                <Linkedin size={18} />
              </a>
            )}
            {prof.socials?.instagram && (
              <a href={prof.socials.instagram} target="_blank" rel="noopener noreferrer" className="p-2 bg-sapphire/5 rounded-full text-sapphire hover:bg-gold hover:text-sapphire transition-all shadow-sm">
                <Instagram size={18} />
              </a>
            )}
            {prof.socials?.facebook && (
              <a href={prof.socials.facebook} target="_blank" rel="noopener noreferrer" className="p-2 bg-sapphire/5 rounded-full text-sapphire hover:bg-gold hover:text-sapphire transition-all shadow-sm">
                <Facebook size={18} />
              </a>
            )}
            {prof.socials?.youtube && (
              <a href={prof.socials.youtube} target="_blank" rel="noopener noreferrer" className="p-2 bg-sapphire/5 rounded-full text-sapphire hover:bg-gold hover:text-sapphire transition-all shadow-sm">
                <Youtube size={18} />
              </a>
            )}
            {prof.socials?.github && (
              <a href={prof.socials.github} target="_blank" rel="noopener noreferrer" className="p-2 bg-sapphire/5 rounded-full text-sapphire hover:bg-gold hover:text-sapphire transition-all shadow-sm">
                <Github size={18} />
              </a>
            )}
            {prof.socials?.behance && (
              <a href={prof.socials.behance} target="_blank" rel="noopener noreferrer" className="p-2 bg-sapphire/5 rounded-full text-sapphire hover:bg-gold hover:text-sapphire transition-all shadow-sm" title="Behance">
                <Palette size={18} />
              </a>
            )}
            {prof.socials?.pinterest && (
              <a href={prof.socials.pinterest} target="_blank" rel="noopener noreferrer" className="p-2 bg-sapphire/5 rounded-full text-sapphire hover:bg-gold hover:text-sapphire transition-all shadow-sm" title="Pinterest">
                <ImageIcon size={18} />
              </a>
            )}
            {prof.socials?.website && (
              <a href={prof.socials.website} target="_blank" rel="noopener noreferrer" className="p-2 bg-sapphire/5 rounded-full text-sapphire hover:bg-gold hover:text-sapphire transition-all shadow-sm">
                <Globe size={18} />
              </a>
            )}
          </div>
        </div>

        <div className="bg-card-bg p-6 rounded-2xl shadow-[0_4px_20px_rgba(15,61,110,0.05)] text-center transition-colors">
          <p className="text-xs text-text-muted mb-3 font-medium">Trabalhe com segurança</p>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onProposeContract}
            className="bg-sapphire text-white w-full py-3.5 rounded-lg font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-sapphire/90 transition-all font-sans"
          >
            Propor Contrato Seguro <span className="text-gold font-bold ml-1">(Escrow)</span>
          </motion.button>
          
          <div className="mt-6 pt-6 border-t border-border-subtle text-left space-y-3">
            <div className="flex items-center gap-2">
              <Lock size={12} className="text-gold" />
              <span className="text-[10px] font-bold text-sapphire uppercase tracking-wider">Escrow Time-lock (48h)</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera size={12} className="text-gold" />
              <span className="text-[10px] font-bold text-sapphire uppercase tracking-wider">Prova Real via Câmera In-App</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={12} className="text-gold" />
              <span className="text-[10px] font-bold text-sapphire uppercase tracking-wider">Dossiê Blockchain Imutável</span>
            </div>
          </div>
          
          <p className="text-[9px] text-text-muted mt-6 font-medium uppercase tracking-wider leading-tight">Taxas regressivas para projetos de alto valor até 0.10%</p>
        </div>
      </section>

      <div className="px-10 flex flex-col gap-10">
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-[1px] text-text-muted">Skills & Portfólio</h3>
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            {prof.skills.map((s, i) => (
              <span key={i} className="px-3 py-1 bg-bg-base border border-border-subtle rounded-md text-[10px] font-bold text-sapphire uppercase tracking-wider">{s}</span>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {projects.slice(0, 4).map((p, i) => (
              <ProjectCard 
                key={i} 
                title={p.title}
                category={p.category}
                image={p.image}
                isEscrow={p.isEscrow}
              />
            ))}
          </div>
        </section>

        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-[1px] text-text-muted">Depoimentos Recentes</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {reviews.map((r, i) => (
              <ReviewCard 
                key={i} 
                name={r.name}
                date={r.date}
                rating={r.rating}
                comment={r.comment}
                avatar={r.avatar}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

const HowItWorksPage = () => {
  return (
    <main className="max-w-7xl mx-auto py-12 px-10 transition-colors duration-300">
      <div className="text-center mb-20">
        <h1 className="text-4xl md:text-5xl font-bold text-sapphire mb-6">Como funciona a SOL-jobs</h1>
        <p className="text-lg text-text-muted max-w-2xl mx-auto">
          Conectamos talentos brasileiros ao mercado global com a segurança da blockchain e a facilidade da moeda local.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center mb-32">
        <div>
          <span className="text-gold font-bold text-sm uppercase tracking-widest mb-4 block">Para Clientes</span>
          <h2 className="text-3xl font-bold text-sapphire mb-8">Contrate com total segurança</h2>
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="w-10 h-10 bg-sapphire/10 rounded-xl flex items-center justify-center shrink-0">
                <Search size={20} className="text-sapphire" />
              </div>
              <div>
                <h3 className="font-bold text-sapphire mb-2">1. Explore e Compare</h3>
                <p className="text-sm text-text-muted leading-relaxed">Navegue por portfólios verificados e encontre o talento ideal para o seu projeto, em qualquer área.</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-10 h-10 bg-sapphire/10 rounded-xl flex items-center justify-center shrink-0">
                <Lock size={20} className="text-sapphire" />
              </div>
              <div>
                <h3 className="font-bold text-sapphire mb-2">2. Depósito no Escrow</h3>
                <p className="text-sm text-text-muted leading-relaxed">Aceite a proposta e deposite o valor. O dinheiro fica travado no Smart Contract. O sistema gera automaticamente um <strong>Contrato de Adesão Jurídico</strong> assinado por comportamento.</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-10 h-10 bg-sapphire/10 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle size={20} className="text-sapphire" />
              </div>
              <div>
                <h3 className="font-bold text-sapphire mb-2">3. Entrega e Time-lock</h3>
                <p className="text-sm text-text-muted leading-relaxed">O profissional comprova a entrega via Câmera In-App com GPS. Você tem 48h para contestar. Se não o fizer, a liberação é automática para evitar calotes.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card-bg p-8 rounded-[40px] border border-border-subtle shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-sapphire/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm mb-6 border border-border-subtle">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span className="text-[10px] uppercase font-bold text-text-muted">Etapa 2 de 3</span>
                </div>
                <span className="text-gold font-bold text-xs">R$ 750,00 (30%)</span>
              </div>
              <div className="h-2 bg-bg-base rounded-full overflow-hidden mb-4">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: "30%" }}
                  className="h-full bg-sapphire"
                />
              </div>
              <p className="text-xs text-text-muted">Marco: Layout aprovado ✓</p>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center px-4 py-2 bg-bg-base/50 rounded-lg">
                <span className="text-[10px] text-text-muted font-bold">ETAPA 1 (20%)</span>
                <CheckCircle size={12} className="text-success" />
              </div>
              <div className="flex justify-between items-center px-4 py-2 bg-gold/5 rounded-lg border border-gold/20">
                <span className="text-[10px] text-gold font-bold">ETAPA 2 (30%)</span>
                <span className="text-[10px] text-gold">Em Escrow</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2 bg-bg-base/20 rounded-lg">
                <span className="text-[10px] text-text-muted opacity-40 font-bold">ETAPA 3 (50%)</span>
                <Lock size={12} className="text-text-muted opacity-40" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center mb-20 direction-rtl">
        <div className="md:order-last">
          <span className="text-gold font-bold text-sm uppercase tracking-widest mb-4 block">Para Profissionais</span>
          <h2 className="text-3xl font-bold text-sapphire mb-8">Escalabilidade Global</h2>
          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center shrink-0">
                <Globe size={20} className="text-gold" />
              </div>
              <div>
                <h3 className="font-bold text-sapphire mb-2">1. Portfólio de Impacto</h3>
                <p className="text-sm text-text-muted leading-relaxed">Crie um perfil profissional em minutos e mostre seus melhores trabalhos para clientes do mundo todo.</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center shrink-0">
                <Zap size={20} className="text-gold" />
              </div>
              <div>
                <h3 className="font-bold text-sapphire mb-2">2. Receba em BRL ou Crypto</h3>
                <p className="text-sm text-text-muted leading-relaxed">Liberdade total. Escolha receber via Pix para liquidez imediata ou em USDC/SOL para investir globalmente.</p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="w-10 h-10 bg-gold/10 rounded-xl flex items-center justify-center shrink-0">
                <Shield size={20} className="text-gold" />
              </div>
              <div>
                <h3 className="font-bold text-sapphire mb-2">3. Reputação On-chain</h3>
                <p className="text-sm text-text-muted leading-relaxed">Cada trabalho concluído aumenta seu score de confiança na plataforma, abrindo portas para projetos maiores.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-sapphire p-8 rounded-[40px] shadow-2xl relative overflow-hidden group border border-white/10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/20 blur-3xl rounded-full" />
          <div className="relative z-10 text-white">
            <div className="mb-8">
              <h4 className="text-xs uppercase tracking-widest opacity-60 mb-2">Saldo Disponível</h4>
              <p className="text-4xl font-bold">12.450 <span className="text-gold">USDC</span></p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] opacity-60 mb-1">Último recebimento</p>
                <p className="font-bold">+ R$ 4.200 (Pix)</p>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] opacity-60 mb-1">Reputação</p>
                <p className="font-bold">⭐ 4.98</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const TalentCard = ({ name, title, rating, rate, skills, avatar, onSelect }: any) => (
  <motion.div 
    whileHover={{ y: -4 }}
    onClick={onSelect}
    className="bg-card-bg p-6 rounded-3xl border border-border-subtle shadow-sm cursor-pointer group hover:bg-sapphire/[0.02] transition-colors"
  >
    <div className="flex items-center gap-4 mb-6">
      <img 
        src={avatar} 
        alt={name} 
        className="w-14 h-14 rounded-2xl object-cover"
      />
      <div>
        <h4 className="font-bold text-sapphire group-hover:text-gold transition-colors">{name}</h4>
        <p className="text-xs text-text-muted">{title}</p>
      </div>
    </div>
    <div className="flex justify-between items-center mb-4">
      <Badge variant="gold">⭐ {rating}</Badge>
      <span className="text-[11px] font-bold text-text-main">{rate}</span>
    </div>
    <div className="flex flex-wrap gap-2">
      {skills.map((skill: string, i: number) => (
        <span key={i} className="px-2 py-1 bg-bg-base text-[9px] font-bold text-text-muted rounded-md uppercase tracking-wider">{skill}</span>
      ))}
    </div>
  </motion.div>
);

const SearchResultsPage = ({ onProfessionalSelect }: { onProfessionalSelect: (profId: string) => void }) => {
  const talents = [
    { id: "mariana", name: "Mariana Silva", title: "Design de Interiores • RJ", rating: "4.9", rate: "A partir de R$ 200", skills: ["SketchUp", "V-Ray", "Moodboards"], avatar: "https://picsum.photos/seed/arch-woman/400/400" },
    { id: "lucas", name: "Lucas Oliveira", title: "Dev Fullstack • SP", rating: "5.0", rate: "R$ 150/hora", skills: ["React", "Solidity", "Node.js"], avatar: "https://picsum.photos/seed/dev-man/400/400" },
    { id: "ana", name: "Ana Costa", title: "Marketing Digital • PR", rating: "4.8", rate: "A partir de R$ 500", skills: ["Copywriting", "SEO", "Ads"], avatar: "https://picsum.photos/seed/write-woman/400/400" },
    { id: "roberto", name: "Roberto Junior", title: "Social Media • MG", rating: "4.7", rate: "R$ 80/hora", skills: ["Instagram", "Conteúdo", "Estratégia"], avatar: "https://picsum.photos/seed/man-sm/400/400" },
    { id: "carla", name: "Carla Mendes", title: "Ilustradora Freelance • RS", rating: "4.9", rate: "A partir de R$ 300", skills: ["Digital Art", "Procreate", "Branding"], avatar: "https://picsum.photos/seed/art-woman/400/400" },
    { id: "felipe", name: "Felipe Guedes", title: "Cientista de Dados • SC", rating: "5.0", rate: "R$ 220/hora", skills: ["Python", "Machine Learning", "DataViz"], avatar: "https://picsum.photos/seed/data-man/400/400" },
  ];

  return (
    <main className="max-w-7xl mx-auto py-12 px-6 md:px-10 transition-colors duration-300">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12">
        <div>
          <h1 className="text-3xl font-bold text-sapphire mb-3">Encontramos {talents.length} especialistas</h1>
          <p className="text-sm text-text-muted">Resultados para sua busca atual em todo o Brasil.</p>
        </div>
        <div className="flex gap-3">
          <select className="bg-card-bg border border-border-subtle rounded-xl px-4 py-2.5 text-xs font-bold text-text-main focus:outline-none cursor-pointer hover:border-sapphire transition-colors">
            <option>Relevância</option>
            <option>Maior Nota</option>
            <option>Menor Valor</option>
          </select>
          <button className="bg-bg-base border border-border-subtle rounded-xl px-4 py-2.5 text-xs font-bold text-text-muted flex items-center gap-2">
            <Menu size={14} /> Filtros
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {talents.map((talent, i) => (
          <TalentCard 
            key={i} 
            {...talent} 
            onSelect={() => onProfessionalSelect(talent.id)}
          />
        ))}
      </div>
    </main>
  );
};

const SecurityPage = () => {
  return (
    <main className="max-w-7xl mx-auto py-16 px-6 md:px-10 transition-colors duration-300">
      <div className="max-w-4xl mb-20">
        <h1 className="text-4xl md:text-6xl font-bold text-sapphire mb-6 tracking-tight">O Fim da Dúvida. <br /><span className="text-gold">A Era da Prova Técnica.</span></h1>
        <p className="text-lg text-text-muted leading-relaxed max-w-2xl">
          A SOL-jobs substitui a confiança subjetiva por protocolos matemáticos e provas criptográficas. Aqui, o dinheiro só sai do cofre quando a execução é comprovada.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-32">
        <div className="bg-card-bg p-10 rounded-[40px] border border-border-subtle shadow-sm">
          <div className="w-14 h-14 bg-sapphire/10 rounded-2xl flex items-center justify-center mb-8">
            <Lock size={28} className="text-sapphire" />
          </div>
          <h2 className="text-2xl font-bold text-sapphire mb-4">Milestone Escrow & Time-lock</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-8">
            O pagamento fica retido em um Smart Contract. Para evitar que o cliente segure o saldo indevidamente, implementamos o <strong>Time-lock</strong>: 48h após o profissional enviar a prova de conclusão, o saldo é liberado automaticamente se não houver contestação.
          </p>
          <div className="bg-bg-base p-4 rounded-xl border border-border-subtle flex items-center gap-3">
            <Clock size={18} className="text-gold" />
            <span className="text-xs font-bold text-sapphire">Liberação Automática em 48/72h</span>
          </div>
        </div>

        <div className="bg-card-bg p-10 rounded-[40px] border border-border-subtle shadow-sm">
          <div className="w-14 h-14 bg-gold/10 rounded-2xl flex items-center justify-center mb-8">
            <Camera size={28} className="text-gold" />
          </div>
          <h2 className="text-2xl font-bold text-sapphire mb-4">Câmera In-App (Prova Irrefutável)</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-8">
            O profissional não pode carregar fotos da galeria. A comprovação deve ser feita via câmera do app em tempo real, registrando <strong>GPS, Data e Hora (Timestamp)</strong> diretamente na blockchain. Sem prova geográfica, o botão "Concluído" não ativa.
          </p>
          <div className="bg-bg-base p-4 rounded-xl border border-border-subtle flex items-center gap-3">
            <MapPin size={18} className="text-sapphire" />
            <span className="text-xs font-bold text-sapphire">Validação Geográfica via Blockchain</span>
          </div>
        </div>

        <div className="bg-sapphire p-10 rounded-[40px] shadow-2xl relative overflow-hidden text-white col-span-1 md:col-span-2">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-14 h-14 bg-gold rounded-2xl flex items-center justify-center mb-8">
                <Briefcase size={28} className="text-sapphire" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Blockchain como Cartório Digital</h2>
              <p className="text-white/70 leading-relaxed mb-8">
                Cada contrato gera um PDF de adesão com <strong>Hash Único</strong>. Fotos de entrega, logs de chat e status de progresso são imutáveis. Em caso de disputa judicial, você tem um dossiê técnico pronto para exportar.
              </p>
              <button className="bg-white text-sapphire font-bold px-6 py-3 rounded-xl text-sm hover:bg-gold transition-all">
                Ver Exemplo de Contrato
              </button>
            </div>
            <div className="bg-white/10 p-8 rounded-3xl border border-white/5 space-y-4">
              <h3 className="text-lg font-bold">Taxas Regressivas (Escrow)</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm py-2 border-b border-white/10">
                  <span className="opacity-60">Até R$ 500</span>
                  <span className="font-bold">1%</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-white/10">
                  <span className="opacity-60">R$ 501 - R$ 5.000</span>
                  <span className="font-bold">0.75%</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-white/10">
                  <span className="opacity-60">R$ 5.001 - R$ 50.000</span>
                  <span className="font-bold">0.50%</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-white/10 text-gold">
                  <span className="opacity-80">Mais de R$ 100k</span>
                  <span className="font-bold">0.10%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-bg-base p-12 rounded-[40px] border border-border-subtle my-20">
        <h2 className="text-center text-3xl font-bold text-sapphire mb-12">Protocolos de Resolução & Integridade</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="bg-card-bg p-8 rounded-3xl border border-border-subtle hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-sapphire/5 rounded-full flex items-center justify-center mb-6">
              <MessageSquare size={24} className="text-sapphire" />
            </div>
            <h3 className="font-bold text-sapphire mb-3 text-lg">Disputa com Fricção Obrigatória</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              O cliente pode contestar a entrega, mas é obrigado a enviar fotos e justificativa técnica via app. O dinheiro fica congelado no Smart Contract (não volta para o cliente nem vai para o prestador), removendo o incentivo financeiro para falsas reclamações.
            </p>
          </div>
          <div className="bg-card-bg p-8 rounded-3xl border border-border-subtle hover:shadow-lg transition-all">
            <div className="w-12 h-12 bg-gold/5 rounded-full flex items-center justify-center mb-6">
              <Shield size={24} className="text-gold" />
            </div>
            <h3 className="font-bold text-sapphire mb-3 text-lg">Malha Fina & Auditoria Humana</h3>
            <p className="text-sm text-text-muted leading-relaxed">
              Usuários (clientes ou prestadores) com histórico de má-fé são suspensos permanentemente pela rede. Reativações exigem a abertura de um ticket de conformidade com análise rigorosa do dossier de evidências blockchain.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
};

const ProposeContractPage = ({ prof, onHire }: { prof: Professional, onHire: (total: number) => void }) => {
  const [contractType, setContractType] = useState<string>(prof.chargingModel === 'milestones' ? 'fixed' : 'hourly');

  const getFeePercentage = (value: number) => {
    if (value >= 100000) return 0.0010; // 0.10%
    if (value >= 15000) return 0.0025; // 0.25%
    if (value >= 10000) return 0.0050; // 0.50%
    if (value >= 1000) return 0.0075; // 0.75%
    return 0.01; // 1%
  };

  const modelLabels = {
    milestones: { label: 'Contrato por Etapas', detail: 'Profissional definiu marcos de entrega.', price: 'Sob Orçamento' },
    hourly: { label: 'Contrato por Hora', detail: 'Pagamento baseado em tempo registrado.', price: prof.rate },
    retainer: { label: 'Assinatura Mensal', detail: 'Serviços recorrentes com valor fixo.', price: prof.rate }
  };

  const visitFee = prof.visitPrice * getFeePercentage(prof.visitPrice);

  return (
    <main className="max-w-4xl mx-auto px-6 md:px-10 py-10 md:py-16 transition-colors duration-300">
      <div className="mb-12 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-sapphire mb-4">Solicitação de Serviço</h1>
          <p className="text-text-muted">Proposta para <strong>{prof.name}</strong>. Método preferencial: <strong>{modelLabels[prof.chargingModel].label}</strong>.</p>
        </div>
        <div className="bg-success/10 border border-success/20 px-4 py-2 rounded-xl flex items-center gap-2">
          <Shield size={16} className="text-success" />
          <span className="text-[10px] font-bold text-success uppercase tracking-widest">Contrato Digital Ativo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-10">
        <div className="space-y-8">
          {/* Briefing Section */}
          <div className="bg-card-bg p-8 rounded-3xl border border-border-subtle shadow-sm space-y-6">
            <h3 className="font-bold text-sapphire flex items-center gap-2">
              <Briefcase size={18} className="text-gold" /> Briefing do Cliente
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-sapphire uppercase tracking-widest mb-2">Título do Projeto</label>
                <input 
                  type="text" 
                  placeholder="Ex: App de Delivery ou Estratégia de Conteúdo" 
                  className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sapphire transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-sapphire uppercase tracking-widest mb-2">Objetivos e Escopo</label>
                <textarea 
                  rows={4}
                  placeholder="Explique suas necessidades para o orçamento..."
                  className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-sapphire transition-colors resize-none"
                ></textarea>
              </div>
              <div>
                <label className="block text-xs font-bold text-sapphire uppercase tracking-widest mb-2">Anexos / Referências</label>
                <div className="grid grid-cols-4 gap-4">
                  <button className="aspect-square bg-bg-base border-2 border-dashed border-border-subtle rounded-2xl flex flex-col items-center justify-center gap-1 text-text-muted hover:border-gold hover:text-gold transition-all">
                    <Camera size={20} />
                    <span className="text-[8px] font-bold uppercase tracking-tighter">Adicionar</span>
                  </button>
                  <div className="aspect-square bg-bg-base rounded-2xl border border-border-subtle overflow-hidden opacity-30 flex items-center justify-center">
                    <ImageIcon size={20} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Model Selection */}
          <div className="bg-card-bg p-8 rounded-3xl border border-border-subtle shadow-sm">
            <h3 className="font-bold text-sapphire mb-6 flex items-center gap-2">
              <Zap size={18} className="text-gold" /> Opções de Cobrança de {prof.name.split(' ')[0]}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              <button 
                onClick={() => setContractType('visit')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  contractType === 'visit' 
                  ? 'border-sapphire bg-sapphire/5 ring-1 ring-sapphire' 
                  : 'border-border-subtle bg-bg-base opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sapphire text-[13px]">{prof.visitType}</h4>
                  {contractType === 'visit' && <CheckCircle size={14} className="text-sapphire" />}
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">Primeira avaliação focada em viabilidade.</p>
                <p className="mt-3 font-bold text-[12px] text-sapphire">R$ {prof.visitPrice},00</p>
              </button>

              <button 
                onClick={() => setContractType('fixed')}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  contractType === 'fixed' 
                  ? 'border-sapphire bg-sapphire/5 ring-1 ring-sapphire' 
                  : 'border-border-subtle bg-bg-base opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-sapphire text-[13px]">{modelLabels[prof.chargingModel].label}</h4>
                  {contractType === 'fixed' && <CheckCircle size={14} className="text-sapphire" />}
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">{modelLabels[prof.chargingModel].detail}</p>
                <p className="mt-3 font-bold text-[12px] text-sapphire">{modelLabels[prof.chargingModel].price}</p>
              </button>
            </div>

            {contractType === 'fixed' && prof.milestones && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Estrutura definida pelo profissional:</p>
                {prof.milestones.map((m, i) => (
                  <div key={i} className="p-3 bg-bg-base/50 rounded-xl border border-border-subtle flex justify-between items-baseline">
                    <span className="text-[11px] font-bold text-text-main">{i + 1}. {m.title}</span>
                    <span className="text-[10px] font-bold text-gold">{m.percentage}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="bg-card-bg p-6 rounded-3xl border border-border-subtle shadow-sm sticky top-24">
            <h3 className="text-xs font-bold text-sapphire uppercase tracking-widest mb-4">Resumo</h3>
            
            {contractType === 'visit' ? (
              <div className="space-y-4">
                <div className="flex justify-between text-[13px]">
                  <span className="text-text-muted">{prof.visitType}</span>
                  <span className="font-bold">R$ {prof.visitPrice},00</span>
                </div>
                <div className="flex justify-between text-[13px]">
                  <span className="text-text-muted">Taxa Regressiva Escrow ({ (getFeePercentage(prof.visitPrice) * 100).toFixed(2) }%)</span>
                  <span className="font-bold">R$ {visitFee.toFixed(2)}</span>
                </div>
                <div className="pt-4 border-t border-border-subtle flex justify-between mb-6">
                  <span className="font-bold text-sapphire">Pagar Agora</span>
                  <span className="font-bold text-sapphire text-lg">R$ {(prof.visitPrice + visitFee).toFixed(2)}</span>
                </div>
                <button 
                  onClick={() => onHire(prof.visitPrice + visitFee)}
                  className="w-full bg-sapphire text-white py-4 rounded-xl font-bold text-[13px] hover:bg-sapphire/90 transition-all shadow-xl shadow-sapphire/20 uppercase tracking-wide"
                >
                  Contratar Agora
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-[11px] text-text-muted leading-relaxed mb-4">
                  Solicitação enviada para avaliação de escopo. {prof.name.split(' ')[0]} responderá com a proposta comercial.
                </p>
                <button 
                  onClick={() => onHire(0)}
                  className="w-full bg-sapphire text-white py-4 rounded-xl font-bold text-[13px] hover:bg-sapphire/90 transition-all uppercase tracking-wide"
                >
                  Solicitar Proposta
                </button>
              </div>
            )}
            
            <div className="mt-6 p-4 bg-gold/5 border border-gold/10 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={14} className="text-gold" />
                <span className="text-[10px] font-bold text-sapphire uppercase tracking-wider">Modo Competitivo Ativo</span>
              </div>
              <p className="text-[9px] text-text-muted leading-relaxed">
                Ao contratar, outros profissionais qualificados também poderão aceitar sua solicitação caso {prof.name.split(' ')[0]} não responda em tempo ágil. Você escolhe quem liberar!
              </p>
            </div>
            <p className="text-[9px] text-center text-text-muted mt-6 italic">Garantia absoluta SOL-jobs Escrow</p>
          </div>
        </aside>
      </div>
    </main>
  );
};

const RegisterPage = ({ onRegister }: { onRegister: (name: string) => void }) => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-12 md:py-20 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
      <div className="flex-1 space-y-6 md:space-y-8 text-center lg:text-left">
        <h1 className="text-3xl md:text-5xl font-extrabold text-sapphire leading-tight tracking-tight">
          Sua conta única.<br />
          <span className="text-gold">Infinitas possibilidades.</span>
        </h1>
        <p className="text-base md:text-lg text-text-muted leading-relaxed max-w-md mx-auto lg:mx-0">
          Na SOL-jobs, uma única identidade permite contratar os melhores especialistas ou oferecer suas próprias habilidades para o mundo.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          <div className="p-6 bg-card-bg border border-border-subtle rounded-[32px] shadow-sm">
            <h3 className="font-bold text-sapphire mb-2 text-sm">Compre Serviços</h3>
            <p className="text-[11px] text-text-muted">Acesse o mercado global com segurança absoluta e rapidez.</p>
          </div>
          <div className="p-6 bg-card-bg border border-border-subtle rounded-[32px] shadow-sm">
            <h3 className="font-bold text-sapphire mb-2 text-sm">Venda Talentos</h3>
            <p className="text-[11px] text-text-muted">Crie seu portfólio profissional e comece a faturar hoje mesmo.</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md bg-card-bg p-6 md:p-10 rounded-[40px] border border-border-subtle shadow-2xl">
        <div className="mb-8 md:mb-10 text-center">
          <h2 className="text-xl md:text-2xl font-bold text-sapphire mb-2">Criar conta SOL-jobs</h2>
          <p className="text-xs md:text-sm text-text-muted">Junte-se ao novo padrão de trabalho global.</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">Nome Completo</label>
            <input 
              type="text" 
              placeholder="Ex: Marcus Viana"
              className="w-full bg-bg-base border border-border-subtle rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-sapphire/20 transition-all outline-none"
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">E-mail</label>
            <input 
              type="email" 
              placeholder="seu@email.com"
              className="w-full bg-bg-base border border-border-subtle rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-sapphire/20 transition-all outline-none"
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">Senha</label>
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full bg-bg-base border border-border-subtle rounded-xl px-5 py-4 text-sm focus:ring-2 focus:ring-sapphire/20 transition-all outline-none"
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onRegister(formData.name)}
            className="w-full bg-sapphire text-white py-5 rounded-xl font-bold text-sm shadow-xl shadow-sapphire/20 mt-6"
          >
            Começar Agora
          </motion.button>

          <p className="text-[11px] text-center text-text-muted mt-6">
            Já tem uma conta? <button className="font-bold text-sapphire hover:underline">Fazer login</button>
          </p>
        </div>
      </div>
    </div>
  );
};

const DashboardPage = ({ user, walletBalance, onSetupProfile, onWalletClick }: { user: { name: string, uid: string }, walletBalance: number, onSetupProfile: () => void, onWalletClick: () => void }) => {
  const [contracts, setContracts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    // Sync Contracts
    const qC = query(collection(db, 'contracts'), where('buyerId', '==', user.uid));
    const unsubscribeC = onSnapshot(qC, (snap) => {
      setContracts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'contracts'));

    // Sync Transactions
    const qT = query(collection(db, 'transactions'), where('userId', '==', user.uid));
    const unsubscribeT = onSnapshot(qT, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => handleFirestoreError(e, OperationType.LIST, 'transactions'));

    return () => { unsubscribeC(); unsubscribeT(); };
  }, [user.uid]);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 md:py-12 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10 md:mb-12">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-sapphire mb-1 md:mb-2 tracking-tight">Painel de Controle</h1>
          <p className="text-sm text-text-muted font-medium">Bem-vindo de volta, <span className="text-sapphire font-bold">{user.name}</span></p>
        </div>
        <div 
          id="wallet-balance-card"
          onClick={onWalletClick}
          className="bg-sapphire text-white p-6 rounded-[32px] shadow-xl shadow-sapphire/20 w-full md:min-w-[240px] md:w-auto cursor-pointer hover:scale-[1.02] active:scale-95 transition-all group overflow-hidden relative"
        >
          <div className="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Saldo na Wallet</span>
              <Wallet size={16} className="text-gold group-hover:rotate-12 transition-transform" />
            </div>
            <p className="text-2xl font-extrabold flex items-center gap-2">
              R$ {walletBalance.toFixed(2)}
              <ArrowUpRight size={16} className="text-gold opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </p>
            <p className="text-[9px] text-white/40 mt-1">Serviço Rápido: Pagar/Receber</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10">
        <div className="lg:col-span-2 space-y-8 md:space-y-10">
          <section>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[11px] md:text-sm font-extrabold text-sapphire uppercase tracking-widest flex items-center gap-2">
                <Briefcase size={14} className="text-gold" /> Minhas Contratações
              </h3>
              <button className="text-[10px] font-bold text-sapphire opacity-40">Ver histórico</button>
            </div>
            {contracts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {contracts.map((contract) => (
                  <div key={contract.id} className="bg-card-bg border border-border-subtle rounded-2xl p-4 flex justify-between items-center shadow-sm">
                    <div>
                      <h4 className="font-bold text-sapphire text-sm">{contract.professionalName}</h4>
                      <p className="text-[10px] text-text-muted">{contract.serviceType}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sapphire text-sm">R$ {contract.amount.toFixed(2)}</p>
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${contract.status === 'requested' ? 'bg-gold/10 text-gold' : 'bg-green-500/10 text-green-600'}`}>
                        {contract.status === 'requested' ? 'Pendente' : 'Ativo'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-card-bg border border-border-subtle rounded-3xl p-6 md:p-8 text-center py-16 md:py-20">
                <div className="w-16 h-16 bg-bg-base rounded-full flex items-center justify-center mx-auto mb-4 text-text-muted shadow-inner">
                  <Search size={24} />
                </div>
                <h4 className="font-bold text-sapphire mb-1 tracking-tight">Nenhuma contratação ativa</h4>
                <p className="text-[11px] text-text-muted">Explore profissionais qualificados para seu próximo projeto.</p>
                <button className="mt-6 font-bold text-[10px] text-sapphire border-b border-sapphire pb-1 uppercase tracking-widest">Buscar Especialistas</button>
              </div>
            )}
          </section>

          <section>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[11px] md:text-sm font-extrabold text-sapphire uppercase tracking-widest flex items-center gap-2">
                <Zap size={14} className="text-gold" /> Transações Recentes
              </h3>
              <button className="text-[10px] font-bold text-sapphire opacity-40">Ver todas</button>
            </div>
            {transactions.length > 0 ? (
              <div className="bg-card-bg border border-border-subtle rounded-3xl overflow-hidden">
                {transactions.map((tx, idx) => (
                  <div key={tx.id} className={`p-4 flex justify-between items-center ${idx !== transactions.length - 1 ? 'border-b border-border-subtle/50' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tx.type === 'deposit' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                        {tx.type === 'deposit' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-sapphire">{tx.description}</p>
                        <p className="text-[9px] text-text-muted capitalize">{tx.method}</p>
                      </div>
                    </div>
                    <p className={`text-xs font-bold ${tx.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'deposit' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gold/5 border border-dashed border-gold/40 rounded-3xl p-8 md:p-12 text-center">
                 <h4 className="font-bold text-sm md:text-base text-sapphire mb-2 tracking-tight">Sem movimentações recentes</h4>
                 <p className="text-[11px] text-text-muted">Suas transações aparecerão aqui.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6 md:space-y-8">
          <div className="bg-card-bg border border-border-subtle rounded-[32px] p-6 shadow-sm">
            <h4 className="text-[10px] font-bold text-sapphire uppercase tracking-widest mb-6">Cartório SOL-jobs</h4>
            <div className="space-y-5">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-green-500/10 text-green-600 rounded-lg flex items-center justify-center shrink-0">
                  <Shield size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-sapphire mb-0.5">Identidade Verificada</p>
                  <p className="text-[9px] text-text-muted">Seu selo de confiança está ativo.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-500/10 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Lock size={16} />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-sapphire mb-0.5">Escrow Protegido</p>
                  <p className="text-[9px] text-text-muted">Suas transações são monitoradas.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-bg-base/50 border border-border-subtle rounded-[32px] p-6 newsletter-highlight">
            <h4 className="text-[10px] font-bold text-sapphire uppercase tracking-widest mb-4 flex items-center gap-2">
              <AlertCircle size={14} className="text-gold" /> Dica do sistema
            </h4>
            <p className="text-[10px] text-text-muted leading-relaxed italic">
              "Use os lucros de suas vendas para contratar talentos sem precisar de novos depósitos."
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

const SetupProfilePage = ({ onSave }: { onSave: (data: any) => void }) => {
  const [model, setModel] = useState<'hourly' | 'milestones' | 'retainer'>('milestones');
  const [category, setCategory] = useState('Arquitetura & Design');
  const [customCategory, setCustomCategory] = useState('');
  const [hasVisitFee, setHasVisitFee] = useState(false);
  const [milestones, setMilestones] = useState([{ title: 'Início do Projeto', percentage: 30 }, { title: 'Entrega Final', percentage: 70 }]);

  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [rate, setRate] = useState('');
  const [visitPrice, setVisitPrice] = useState('');
  const [visitType, setVisitType] = useState('Presencial');

  const categories = [
    'Arquitetura & Design',
    'Engenharia & Construção',
    'Software & Web3',
    'Marketing & Growth',
    'Consultoria Técnica',
    'Design Gráfico & UX',
    'Fotografia & Vídeo',
    'Artesanato & Decoração',
    'Assistência Residencial (Reparos)',
    'Eventos & Experiências',
    'Saúde & Bem-estar',
    'Educação & Treinamento',
    'Jurídico & Compliance',
    'Outros (escrever abaixo)'
  ];

  const addMilestone = () => setMilestones([...milestones, { title: '', percentage: 0 }]);
  const removeMilestone = (index: number) => setMilestones(milestones.filter((_, i) => i !== index));

  const handleSave = () => {
    onSave({
      title,
      category: category === 'Outros (escrever abaixo)' ? customCategory : category,
      bio,
      chargingModel: model,
      milestones,
      rate: model === 'hourly' ? `R$ ${rate} / hora` : (model === 'retainer' ? `R$ ${rate} / mês` : `R$ ${rate} (Base)`),
      visitPrice: hasVisitFee ? Number(visitPrice) : 0,
      visitType: hasVisitFee ? visitType : 'N/A',
      rating: "5.0",
      projectsCount: 0,
      completionRate: "100%",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400" // Default for now
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 md:py-16">
      <div className="mb-10 md:mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-sapphire mb-2 md:mb-4 tracking-tight">Configure sua Oferta</h1>
        <p className="text-sm text-text-muted font-medium">Defina como você deseja ser contratado e como o Escrow deve operar.</p>
      </div>

      <div className="space-y-8 md:space-y-12">
        {/* Basic Info */}
        <section className="bg-card-bg p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-border-subtle shadow-sm">
          <h3 className="text-xs md:text-sm font-bold text-sapphire uppercase tracking-widest mb-6 border-b border-border-subtle pb-4">Informações</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">Título Profissional</label>
                <input 
                  type="text" 
                  placeholder="Ex: Arquiteto Senior" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3.5 text-sm outline-none" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">Categoria</label>
                <select 
                  className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3.5 text-sm outline-none mb-3"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {categories.map((cat, idx) => (
                    <option key={idx} value={cat}>{cat}</option>
                  ))}
                </select>
                
                {category === 'Outros (escrever abaixo)' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <input 
                      type="text" 
                      placeholder="Sua categoria específica?" 
                      className="w-full bg-bg-base border border-gold/30 rounded-xl px-4 py-3.5 text-sm outline-none focus:border-gold"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                    />
                  </motion.div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">Bio Curta</label>
              <textarea 
                placeholder="Diferenciais e experiência..." 
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full h-[142px] bg-bg-base border border-border-subtle rounded-xl px-4 py-4 text-sm outline-none resize-none leading-relaxed"
              ></textarea>
            </div>
          </div>
        </section>

        {/* Pricing Model */}
        <section className="bg-card-bg p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-border-subtle shadow-sm">
          <h3 className="text-xs md:text-sm font-bold text-sapphire uppercase tracking-widest mb-6 border-b border-border-subtle pb-4">Método de Cobrança</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-8">
            <button 
              onClick={() => setModel('hourly')}
              className={`p-5 md:p-6 rounded-2xl md:rounded-3xl border text-center transition-all ${model === 'hourly' ? 'border-sapphire bg-sapphire/5 ring-1 ring-sapphire' : 'border-border-subtle opacity-60'}`}
            >
              <Clock size={20} className="mx-auto mb-2 text-gold" />
              <h4 className="font-bold text-sapphire text-[10px] md:text-xs">Por Hora</h4>
            </button>
            <button 
              onClick={() => setModel('milestones')}
              className={`p-5 md:p-6 rounded-2xl md:rounded-3xl border text-center transition-all ${model === 'milestones' ? 'border-sapphire bg-sapphire/5 ring-1 ring-sapphire' : 'border-border-subtle opacity-60'}`}
            >
              <Zap size={20} className="mx-auto mb-2 text-gold" />
              <h4 className="font-bold text-sapphire text-[10px] md:text-xs">Por Etapas</h4>
            </button>
            <button 
              onClick={() => setModel('retainer')}
              className={`p-5 md:p-6 rounded-2xl md:rounded-3xl border text-center transition-all ${model === 'retainer' ? 'border-sapphire bg-sapphire/5 ring-1 ring-sapphire' : 'border-border-subtle opacity-60'}`}
            >
              <Briefcase size={20} className="mx-auto mb-2 text-gold" />
              <h4 className="font-bold text-sapphire text-[10px] md:text-xs">Recorrência</h4>
            </button>
          </div>

          <div className="space-y-4">
             <div>
                <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">
                  {model === 'hourly' ? 'Valor da Hora' : (model === 'retainer' ? 'Valor Mensal' : 'Valor Base do Projeto')}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">R$</span>
                  <input 
                    type="number" 
                    placeholder="0,00" 
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    className="w-full bg-bg-base border border-border-subtle rounded-xl pl-10 pr-4 py-4 text-sm outline-none font-extrabold text-sapphire" 
                  />
                </div>
              </div>

            {model === 'milestones' && (
              <div className="space-y-4 mt-6">
                <div className="flex justify-between items-center mb-4">
                  <label className="text-[10px] font-bold text-sapphire uppercase tracking-widest">Definir Etapas (Distribuição do Valor)</label>
                  <button onClick={addMilestone} className="text-[10px] font-bold text-gold uppercase underline">Adicionar</button>
                </div>
                {milestones.map((m, i) => (
                  <div key={i} className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center bg-bg-base p-4 rounded-2xl border border-border-subtle">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <span className="text-[10px] font-bold text-gold shrink-0">#{i+1}</span>
                      <input 
                        type="text" 
                        placeholder="Nome da etapa" 
                        value={m.title}
                        onChange={(e) => {
                          const newM = [...milestones];
                          newM[i].title = e.target.value;
                          setMilestones(newM);
                        }}
                        className="flex-1 bg-transparent border-none outline-none text-xs font-medium"
                      />
                    </div>
                    <div className="flex items-center gap-4 w-full sm:w-32 justify-between sm:justify-end">
                      <div className="w-20">
                        <input 
                          type="number" 
                          placeholder="%" 
                          value={m.percentage}
                          onChange={(e) => {
                            const newM = [...milestones];
                            newM[i].percentage = Number(e.target.value);
                            setMilestones(newM);
                          }}
                          className="w-full bg-sapphire/5 rounded-lg px-3 py-1.5 text-center text-xs font-bold text-sapphire outline-none"
                        />
                      </div>
                      <button onClick={() => removeMilestone(i)} className="text-red-400 hover:text-red-500 transition-colors"><X size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Technical Visit */}
        <section className="bg-card-bg p-6 md:p-8 rounded-[32px] md:rounded-[40px] border border-border-subtle shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-xs md:text-sm font-bold text-sapphire uppercase tracking-widest mb-1">Visita / Orçamento</h3>
              <p className="text-[10px] text-text-muted max-w-[200px]">Cobrar para avaliar o projeto no local ou virtual.</p>
            </div>
            <button 
              onClick={() => setHasVisitFee(!hasVisitFee)}
              className={`w-12 h-6 rounded-full transition-all relative ${hasVisitFee ? 'bg-gold' : 'bg-border-subtle'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${hasVisitFee ? 'left-7' : 'left-1'}`} />
            </button>
          </div>

          {hasVisitFee && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">Tipo</label>
                <select 
                  className="w-full bg-bg-base border border-border-subtle rounded-xl px-4 py-3.5 text-sm outline-none"
                  value={visitType}
                  onChange={(e) => setVisitType(e.target.value)}
                >
                  <option>Presencial</option>
                  <option>Online</option>
                  <option>Auditoria</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">Preço</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-text-muted">R$</span>
                  <input 
                    type="number" 
                    placeholder="0,00" 
                    value={visitPrice}
                    onChange={(e) => setVisitPrice(e.target.value)}
                    className="w-full bg-bg-base border border-border-subtle rounded-xl pl-10 pr-4 py-3.5 text-sm outline-none font-extrabold text-sapphire" 
                  />
                </div>
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button 
            onClick={handleSave}
            className="flex-1 bg-sapphire text-white py-5 rounded-[24px] font-bold text-sm shadow-xl shadow-sapphire/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            Salvar e Publicar Perfil
          </button>
          <button onClick={() => onSave(null)} className="px-10 py-5 rounded-[24px] border border-border-subtle font-bold text-sm text-text-muted hover:bg-bg-base transition-all active:scale-95">Descartar</button>
        </div>
      </div>
    </div>
  );
};

const QuickServiceModal = ({ 
  isOpen, 
  onClose, 
  balance 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  balance: number 
}) => {
  const [activeTab, setActiveTab] = useState<'pay' | 'receive'>('pay');
  const [activeSubTab, setActiveSubTab] = useState<'liquidate' | 'docs'>('liquidate');
  const [method, setMethod] = useState<'pix' | 'usdc' | 'usdt' | 'sol'>('pix');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [images, setImages] = useState<string[]>([]);

  const handleAddImage = () => {
    // Simulating image upload
    const mockImages = [
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=200',
      'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=200'
    ];
    const randomImg = mockImages[Math.floor(Math.random() * mockImages.length)];
    if (images.length < 3) setImages([...images, randomImg]);
  };

  const history = [
    { id: 1, type: 'receive', amount: 450, method: 'pix', date: 'Hoje, 10:20', label: 'Pagamento Render Adicional', hasDocs: true },
    { id: 2, type: 'pay', amount: 120, method: 'usdc', date: 'Ontem, 18:45', label: 'Custo Assets 3D' },
    { id: 3, type: 'receive', amount: 2500, method: 'brl', date: '25 Abr', label: 'Milestone 2 - Projeto Cabo Frio', hasDocs: true },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-sapphire/60 backdrop-blur-md z-[120] flex items-center justify-center p-4 md:p-6"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 30 }}
          className="bg-bg-base w-full max-w-lg rounded-[40px] shadow-2xl border border-border-subtle overflow-hidden relative"
          onClick={e => e.stopPropagation()}
        >
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-text-muted hover:text-sapphire transition-colors z-10"
          >
            <X size={20} />
          </button>

          <header className="p-8 pb-4 text-center">
            <h2 className="text-xl font-extrabold text-sapphire tracking-tight mb-2">Serviço Rápido SOL-jobs</h2>
            <p className="text-[11px] text-text-muted uppercase tracking-widest font-bold">Liquiditade Profissional Instantânea</p>
          </header>

          <div className="px-8 pb-8 space-y-6">
            {/* Balance Section */}
            <div className="bg-sapphire text-white p-6 rounded-3xl shadow-xl shadow-sapphire/10 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
               <div className="relative z-10 text-center">
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">Saldo Protegido na Wallet</p>
                  <p className="text-3xl font-extrabold">R$ {balance.toFixed(2)}</p>
               </div>
            </div>

            {/* Pay/Receive Tabs */}
            <div className="flex bg-card-bg p-1 rounded-2xl border border-border-subtle">
              <button 
                onClick={() => { setActiveTab('pay'); setShowQR(false); }}
                className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'pay' ? 'bg-sapphire text-white shadow-lg' : 'text-text-muted hover:bg-bg-base'}`}
              >
                <ArrowUpRight size={14} /> Pagar
              </button>
              <button 
                onClick={() => { setActiveTab('receive'); setShowQR(false); }}
                className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'receive' ? 'bg-sapphire text-white shadow-lg' : 'text-text-muted hover:bg-bg-base'}`}
              >
                <ArrowDownLeft size={14} /> Receber
              </button>
            </div>

            {/* Sub-Tabs: Liquidation vs Evidence */}
            <div className="flex gap-4 border-b border-border-subtle pb-2">
              <button 
                onClick={() => setActiveSubTab('liquidate')}
                className={`text-[10px] font-bold uppercase tracking-widest pb-1 transition-all ${activeSubTab === 'liquidate' ? 'text-sapphire border-b-2 border-sapphire' : 'text-text-muted opacity-60 hover:opacity-100'}`}
              >
                1. Liquidação
              </button>
              <button 
                onClick={() => setActiveSubTab('docs')}
                className={`text-[10px] font-bold uppercase tracking-widest pb-1 transition-all flex items-center gap-2 ${activeSubTab === 'docs' ? 'text-sapphire border-b-2 border-sapphire' : 'text-text-muted opacity-60 hover:opacity-100'}`}
              >
                2. Prova / Fiscal {images.length > 0 && <span className="bg-gold text-sapphire px-1.5 rounded-full text-[8px]">{images.length}</span>}
              </button>
            </div>

            {/* Form Section */}
            {!showQR ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {activeSubTab === 'liquidate' ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">Valor do Ajuste / Serviço</label>
                      <div className="relative">
                        <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">R$</span>
                        <input 
                          type="number" 
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="w-full bg-card-bg border border-border-subtle rounded-2xl pl-12 pr-5 py-4 text-sm font-bold text-sapphire outline-none focus:ring-2 focus:ring-sapphire/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">Mensagem / Observação Professional</label>
                      <textarea 
                        placeholder="Ex: Referente ao ajuste de iluminação na cena 04 conforme solicitado no Slack."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full bg-card-bg border border-border-subtle rounded-2xl p-4 text-xs font-medium text-text-main outline-none focus:ring-2 focus:ring-sapphire/10 transition-all resize-none h-24"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-sapphire uppercase tracking-widest mb-2 ml-1">Forma de Liquidação</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'pix', label: 'PIX', color: 'text-teal-500' },
                          { id: 'usdc', label: 'USDC', color: 'text-blue-500' },
                          { id: 'usdt', label: 'USDT', color: 'text-green-500' },
                          { id: 'sol', label: 'SOL', color: 'text-purple-500' },
                        ].map((m) => (
                          <button 
                            key={m.id}
                            onClick={() => setMethod(m.id as any)}
                            className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${method === m.id ? 'border-sapphire bg-sapphire/5 ring-1 ring-sapphire' : 'border-border-subtle bg-bg-base grayscale opacity-60 hover:grayscale-0 hover:opacity-100'}`}
                          >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] ${m.color} bg-white shadow-sm border border-border-subtle`}>
                               {m.id.toUpperCase()}
                            </div>
                            <span className="text-[9px] font-bold text-sapphire">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-bg-base/50 border-2 border-dashed border-border-subtle rounded-3xl p-8 text-center group hover:border-gold/40 transition-all cursor-pointer" onClick={handleAddImage}>
                      <div className="w-12 h-12 bg-card-bg rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border-subtle shadow-sm group-hover:scale-110 transition-transform">
                        <Camera size={24} className="text-gold" />
                      </div>
                      <h4 className="text-xs font-bold text-sapphire mb-1 tracking-tight">Anexar Prova de Trabalho</h4>
                      <p className="text-[10px] text-text-muted max-w-[200px] mx-auto leading-relaxed">
                        Envie fotos da entrega ou prints para gerar o <span className="text-gold font-bold">Dossiê SOL-jobs</span> (Nota Fiscal Digital).
                      </p>
                      <input type="file" className="hidden" />
                      <button className="mt-4 flex items-center gap-2 mx-auto text-[10px] font-bold text-sapphire border border-border-subtle px-4 py-2 rounded-xl bg-card-bg group-hover:bg-gold group-hover:border-gold transition-all">
                        <Upload size={14} /> Selecionar Arquivos
                      </button>
                    </div>

                    {images.length > 0 && (
                      <div className="grid grid-cols-3 gap-3">
                        {images.map((img, idx) => (
                          <div key={idx} className="aspect-square rounded-2xl overflow-hidden border border-border-subtle relative group">
                            <img src={img} alt="Evidence" className="w-full h-full object-cover" />
                            <button 
                              onClick={(e) => { e.stopPropagation(); setImages(images.filter((_, i) => i !== idx)); }}
                              className="absolute top-2 right-2 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-success/5 border border-success/20 p-4 rounded-2xl flex gap-3">
                      <Shield size={16} className="text-success shrink-0" />
                      <div>
                        <p className="text-[10px] font-bold text-success mb-0.5 uppercase tracking-wide">Documento Fiscal Imutável</p>
                        <p className="text-[9px] text-text-muted leading-relaxed">Estes arquivos serão criptografados e anexados ao hash da transação, servindo como recibo oficial vitalício.</p>
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  disabled={!amount || (activeSubTab === 'docs' && images.length === 0 && activeTab === 'receive')}
                  onClick={() => {
                    if (activeSubTab === 'liquidate') {
                      setShowQR(true);
                    } else {
                      setActiveSubTab('liquidate');
                    }
                  }}
                  className="w-full bg-sapphire text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-sapphire/20 transition-all hover:scale-[1.01] hover:bg-sapphire/90 disabled:opacity-50 disabled:grayscale disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {activeSubTab === 'liquidate' 
                    ? (activeTab === 'pay' ? 'Confirmar Pagamento' : 'Gerar Link de Recebimento')
                    : 'Avançar para Liquidação'
                  }
                </button>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card-bg p-8 rounded-[32px] border border-border-subtle text-center space-y-4"
              >
                <div className="w-48 h-48 bg-white p-4 rounded-2xl mx-auto shadow-inner border border-border-subtle flex items-center justify-center">
                  <div className="relative group">
                    <QrCode size={140} className="text-sapphire" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <div className="bg-white p-1 rounded-lg">
                          {method === 'pix' ? <div className="text-[10px] font-black text-teal-500">PIX</div> : <Coins size={20} className="text-gold" />}
                       </div>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-sapphire">R$ {parseFloat(amount).toFixed(2)} via {method.toUpperCase()}</p>
                  <p className="text-[10px] text-text-muted mt-1">Escaneie para {activeTab === 'pay' ? 'pagar' : 'receber'}</p>
                </div>
                <button 
                  onClick={() => setShowQR(false)}
                  className="text-[10px] font-bold text-sapphire uppercase tracking-widest border-b border-sapphire pb-0.5"
                >
                  Voltar e Alterar
                </button>
              </motion.div>
            )}

            {/* History Feed */}
            {!showQR && (
              <div>
                <h3 className="text-[10px] font-bold text-sapphire uppercase tracking-widest mb-4 flex items-center gap-2">
                  <History size={12} className="text-gold" /> Atividade Recente
                </h3>
                <div className="space-y-3">
                  {history.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-bg-base border border-border-subtle rounded-2xl">
                      <div className="flex gap-3 items-center">
                        <div className={`p-2 rounded-lg ${item.type === 'receive' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                          {item.type === 'receive' ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-sapphire leading-tight flex items-center gap-2">
                             {item.label}
                             {item.hasDocs && <FileCheck size={10} className="text-success" title="Documento Fiscal Salvo" />}
                          </p>
                          <p className="text-[8px] text-text-muted uppercase font-bold">{item.date} • {item.method.toUpperCase()}</p>
                        </div>
                      </div>
                      <p className={`text-xs font-bold ${item.type === 'receive' ? 'text-green-600' : 'text-red-600'}`}>
                        {item.type === 'receive' ? '+' : '-'} R$ {item.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [isDark, setIsDark] = useState(false);
  const [selectedProfId, setSelectedProfId] = useState<string>('mariana');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(1500);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isQuickServiceOpen, setIsQuickServiceOpen] = useState(false);
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<{name: string, initials: string, uid: string} | null>(null);

  // Sync Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const initials = user.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
        setCurrentUser({ 
          name: user.displayName || user.email?.split('@')[0] || 'User', 
          initials,
          uid: user.uid 
        });
        setIsLoggedIn(true);
        
        // Sync User Balance and Info from Firestore
        const publicInfoRef = doc(db, 'users', user.uid, 'public', 'info');
        onSnapshot(publicInfoRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setWalletBalance(data.walletBalance || 0);
          } else {
            // First time user registration in Firestore
            const initials = user.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??';
            setDoc(publicInfoRef, {
              name: user.displayName || user.email?.split('@')[0],
              initials,
              walletBalance: 1500, // Starting balance
              updatedAt: serverTimestamp()
            }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/public/info`));

            // Create private record (LGPD)
            setDoc(doc(db, 'users', user.uid, 'private', 'info'), {
              email: user.email,
              updatedAt: serverTimestamp()
            }).catch(e => handleFirestoreError(e, OperationType.WRITE, `users/${user.uid}/private/info`));
          }
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}/public/info`);
        });
      } else {
        setCurrentUser(null);
        setIsLoggedIn(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const professionals: Record<string, Professional> = {
    mariana: {
      id: 'mariana',
      name: "Mariana Silva",
      title: "Design de Interiores • Rio de Janeiro, RJ",
      category: "Interiores",
      rating: "4.9",
      rate: "R$ 2.500 (Base)",
      skills: ["SketchUp", "V-Ray", "Moodboards", "Interiores"],
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400",
      bio: "Criando espaços que inspiram. Especialista em interiores residenciais modernos e funcionais. Apaixonada por cores e texturas que contam histórias reais.",
      projectsCount: 120,
      completionRate: "98%",
      chargingModel: 'milestones',
      visitType: 'Técnica',
      visitPrice: 150,
      milestones: [
        { title: 'Briefing e Moodboard', percentage: 20 },
        { title: 'Layout 3D Final', percentage: 30 },
        { title: 'Detalhamento Técnico', percentage: 50 }
      ],
      socials: {
        instagram: "https://instagram.com",
        pinterest: "https://pinterest.com",
        website: "https://marianadi.com"
      }
    },
    lucas: {
      id: 'lucas',
      name: "Lucas Oliveira",
      title: "Desenvolvedor Fullstack • São Paulo, SP",
      category: "Web App",
      rating: "5.0",
      rate: "R$ 150 / hora",
      skills: ["React", "Solidity", "Node.js", "Web3", "Blockchain"],
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400",
      bio: "Focado em soluções escaláveis e Web3. Desenvolvo desde MVPs até smart contracts complexos. Código limpo, entrega ágil e performance em primeiro lugar.",
      projectsCount: 85,
      completionRate: "100%",
      chargingModel: 'hourly',
      visitType: 'Consultoria',
      visitPrice: 300,
      milestones: [
        { title: 'MVP Architecture', percentage: 40 },
        { title: 'Testing & QA', percentage: 30 },
        { title: 'Deploy & Handover', percentage: 30 }
      ],
      socials: {
        linkedin: "https://linkedin.com",
        github: "https://github.com",
        youtube: "https://youtube.com"
      }
    },
    ana: {
      id: 'ana',
      name: "Ana Costa",
      title: "Marketing Digital • Curitiba, PR",
      category: "Growth",
      rating: "4.8",
      rate: "R$ 1.200 / mês",
      skills: ["SEO", "Copywriting", "Ads", "Growth Hacking", "Estratégia"],
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400",
      bio: "Transformo cliques em clientes. Especialista em inbound marketing e funis de venda de alta conversão para negócios digitais escaláveis.",
      projectsCount: 64,
      completionRate: "95%",
      chargingModel: 'retainer',
      visitType: 'Auditoria',
      visitPrice: 250,
      socials: {
        linkedin: "https://linkedin.com",
        website: "https://anagrowth.com",
        instagram: "https://instagram.com"
      }
    }
  };

  const handleProfessionalSelect = (id: string) => {
    setSelectedProfId(id);
    setCurrentView('profile');
  };

  const toggleDark = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleHireClick = (amount: number) => {
    // Check for login before hiring
    if (!isLoggedIn) {
      setCurrentView('register');
      return;
    }

    setPaymentAmount(amount);
    if (amount === 0) {
      // Just solicitation, show direct success
      triggerSuccess();
    } else {
      setIsPaymentModalOpen(true);
    }
  };

  const handleConfirmPayment = async (method: string) => {
    if (!currentUser) return;
    
    setIsPaymentModalOpen(false);
    
    try {
      const contractId = `ct_${Date.now()}`;
      const txId = `tx_${Date.now()}`;
      
      // Update balance if wallet
      if (method === 'wallet') {
        const newBalance = walletBalance - paymentAmount;
        await setDoc(doc(db, 'users', currentUser.uid, 'public', 'info'), {
          walletBalance: newBalance,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      // Create Contract
      await setDoc(doc(db, 'contracts', contractId), {
        buyerId: currentUser.uid,
        professionalId: selectedProfId,
        amount: paymentAmount,
        status: 'requested',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create Transaction log
      await setDoc(doc(db, 'transactions', txId), {
        userId: currentUser.uid,
        type: 'pay',
        amount: paymentAmount,
        method: method,
        label: `Escrow: Proposta para ${professionals[selectedProfId]?.name || selectedProfId}`,
        contractId: contractId,
        date: serverTimestamp()
      });

      triggerSuccess();
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'payment_flow');
    }
  };

  const triggerSuccess = () => {
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 8000);
    setCurrentView('home');
  };

  const renderContent = () => {
    const prof = professionals[selectedProfId] || professionals.mariana;
    
    const handleRegister = async () => {
      try {
        await signInWithGoogle();
        setCurrentView('dashboard');
      } catch (error) {
        console.error("Login Error:", error);
      }
    };
    
    switch (currentView) {
      case 'home':
        return (
          <HomePage 
            onProfessionalSelect={handleProfessionalSelect} 
            onSearch={() => setCurrentView('search-results')}
          />
        );
      case 'profile':
        return <ProfilePage prof={prof} onProposeContract={() => setCurrentView('propose-contract')} />;
      case 'how-it-works':
        return <HowItWorksPage />;
      case 'search-results':
        return <SearchResultsPage onProfessionalSelect={handleProfessionalSelect} />;
      case 'security':
        return <SecurityPage />;
      case 'propose-contract':
        return <ProposeContractPage prof={prof} onHire={handleHireClick} />;
      case 'register':
        return <RegisterPage onRegister={handleRegister} />;
      case 'dashboard':
        return currentUser ? (
          <DashboardPage 
            user={currentUser} 
            walletBalance={walletBalance} 
            onSetupProfile={() => setCurrentView('setup-profile')} 
            onWalletClick={() => setIsQuickServiceOpen(true)}
          />
        ) : <RegisterPage onRegister={handleRegister} />;
      case 'setup-profile':
        return <SetupProfilePage onSave={async (profileData: any) => {
          if (!currentUser) return;
          try {
            await setDoc(doc(db, 'professionals', currentUser.uid), {
              ...profileData,
              userId: currentUser.uid,
              updatedAt: serverTimestamp()
            }, { merge: true });
            
            // Mark user as professional
            await setDoc(doc(db, 'users', currentUser.uid, 'public', 'info'), {
              isProfessional: true,
              updatedAt: serverTimestamp()
            }, { merge: true });

            setCurrentView('dashboard');
          } catch (e) {
            handleFirestoreError(e, OperationType.WRITE, `professionals/${currentUser.uid}`);
          }
        }} />;
      default:
        return <HomePage onProfessionalSelect={handleProfessionalSelect} onSearch={() => setCurrentView('search-results')} />;
    }
  };

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden bg-bg-base transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <Header 
        currentView={currentView} 
        onViewChange={setCurrentView} 
        isDark={isDark} 
        onToggleDark={toggleDark} 
        isLoggedIn={isLoggedIn}
        user={currentUser || undefined}
      />

      <motion.div
        key={currentView}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {renderContent()}
      </motion.div>

      <QuickServiceModal 
        isOpen={isQuickServiceOpen} 
        onClose={() => setIsQuickServiceOpen(false)}
        balance={walletBalance}
      />

      <PaymentModal 
        isOpen={isPaymentModalOpen} 
        onClose={() => setIsPaymentModalOpen(false)}
        amount={paymentAmount}
        walletBalance={walletBalance}
        onConfirm={handleConfirmPayment}
      />

      {/* Success Toast / Feedback */}
      {showSuccessToast && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-10 left-10 right-10 md:left-auto md:right-10 md:max-w-md z-[110]"
        >
          <div className="bg-sapphire text-white p-6 rounded-3xl shadow-2xl border border-white/10">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-gold rounded-full flex items-center justify-center shrink-0">
                <CheckCircle size={24} className="text-sapphire" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-lg">Solicitação Enviada!</h4>
                <p className="text-xs text-white/80 leading-relaxed">
                  Aguardando aprovação do prestador. Se não for aceito em <strong>24 horas</strong>, seu saldo será automaticamente destravado.
                </p>
                <p className="text-[10px] bg-white/10 p-3 rounded-xl italic border border-white/5">
                  "Você pode continuar procurando outros especialistas agora mesmo. Quem aceitar primeiro, você decide se fecha o contrato oficial!"
                </p>
              </div>
              <button onClick={() => setShowSuccessToast(false)} className="opacity-40 hover:opacity-100 transition-opacity">
                <X size={20} />
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Shared Footer */}
      <footer className="bg-card-bg border-t border-border-subtle py-16 px-6 md:px-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="max-w-xs">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-6 h-6 bg-sapphire rounded flex items-center justify-center">
                <div className="w-3 h-3 bg-sun rounded-full" />
              </div>
              <span className="text-lg font-bold tracking-tight text-sapphire">SOL-jobs Professional</span>
            </div>
            <p className="text-sm text-text-muted leading-relaxed">
              A plataforma brasileira que conecta talentos de qualquer área ao mercado global operando via Solana e Real.
            </p>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-12">
            <div className="flex flex-col gap-4">
              <h5 className="text-[10px] uppercase tracking-widest font-bold text-sapphire">Plataforma</h5>
              <a href="#" className="text-sm text-text-muted hover:text-sapphire transition-colors">Explorar</a>
              <a href="#" className="text-sm text-text-muted hover:text-sapphire transition-colors">Escrow</a>
              <a href="#" className="text-sm text-text-muted hover:text-sapphire transition-colors">Taxas</a>
            </div>
            <div className="flex flex-col gap-4">
              <h5 className="text-[10px] uppercase tracking-widest font-bold text-sapphire">Suporte</h5>
              <a href="#" className="text-sm text-text-muted hover:text-sapphire transition-colors">Ajuda</a>
              <a href="#" className="text-sm text-text-muted hover:text-sapphire transition-colors">Segurança</a>
              <a href="#" className="text-sm text-text-muted hover:text-sapphire transition-colors">Termos</a>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-border-subtle flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-text-muted">
            © 2026 SOL-jobs. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-xs text-text-muted font-bold uppercase tracking-wider">
            <a href="#" className="hover:text-sapphire transition-colors">YouTube</a>
            <a href="#" className="hover:text-sapphire transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
