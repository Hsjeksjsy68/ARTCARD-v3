import React, { useState } from 'react';
import { X, Wallet, Plus, CreditCard, CheckCircle, ArrowUpRight, History, Sparkles, Smartphone, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatCurrency } from '../lib/utils';
import { db, doc, setDoc, updateDoc, increment, collection, addDoc, User } from '../lib/firebase';


interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  walletBalance: number;
  onTopUpSuccess?: (amount: number) => void;
  onOpenAuth?: () => void;
}

export function WalletModal({
  isOpen,
  onClose,
  user,
  walletBalance,
  onTopUpSuccess,
  onOpenAuth
}: WalletModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'bkash' | 'nagad' | 'card' | 'instant'>('bkash');
  const [accountNumber, setAccountNumber] = useState<string>('01700000000');
  const [trxId, setTrxId] = useState<string>('TXN' + Math.floor(10000000 + Math.random() * 90000000));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successAmount, setSuccessAmount] = useState<number>(0);

  const presetAmounts = [500, 1000, 2500, 5000, 10000];

  const handleSelectPreset = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomAmount(val);
    if (val && !isNaN(Number(val))) {
      setSelectedAmount(Number(val));
    }
  };

  const activeAmount = customAmount ? Number(customAmount) : selectedAmount;

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!activeAmount || activeAmount <= 0) {
      alert("Please select or enter a valid amount.");
      return;
    }

    setIsProcessing(true);

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        walletBalance: increment(activeAmount),
        email: user.email
      }, { merge: true });

      // Record transaction
      const txRef = collection(db, 'transactions');
      await addDoc(txRef, {
        userId: user.uid,
        userEmail: user.email,
        type: 'top_up',
        amount: activeAmount,
        paymentMethod,
        description: `Wallet Top-Up via ${paymentMethod.toUpperCase()}`,
        timestamp: Date.now()
      });

      setSuccessAmount(activeAmount);
      setIsProcessing(false);
      setIsSuccess(true);
      if (onTopUpSuccess) {
        onTopUpSuccess(activeAmount);
      }
    } catch (error) {
      console.error("Top-up failed:", error);
      alert("Failed to load funds. Please try again.");
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/85 flex items-center justify-center z-50 p-4 overflow-y-auto backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white w-full max-w-xl border-4 border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative my-8 overflow-hidden"
        >
          {/* Header Bar */}
          <div className="bg-black text-white p-6 flex items-center justify-between border-b-4 border-black">
            <div className="flex items-center gap-3">
              <div className="bg-[#D4FF00] text-black p-2 border-2 border-black">
                <Wallet size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[#D4FF00]">
                  ARTCARD WALLET
                </h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">
                  SECURE DIGITAL BALANCE NODE
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="bg-white text-black hover:bg-[#D4FF00] p-2 border-2 border-black font-black transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Current Balance Display */}
            <div className="bg-[#D4FF00]/15 border-2 border-black p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-neutral-600 block mb-1">
                  CURRENT AVAILABLE FUNDS
                </span>
                <span className="text-3xl sm:text-4xl font-black text-black tracking-tighter">
                  {formatCurrency(walletBalance)}
                </span>
              </div>
              <div className="bg-black text-[#D4FF00] px-3 py-1.5 border-2 border-black text-xs font-black uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck size={16} /> INSTANT CONVERSION
              </div>
            </div>

            {isSuccess ? (
              <div className="py-8 text-center space-y-5">
                <div className="w-20 h-20 bg-[#D4FF00] border-4 border-black flex items-center justify-center mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                  <CheckCircle size={44} className="text-black" />
                </div>
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter text-black">
                    TOP-UP SUCCESSFUL!
                  </h3>
                  <p className="text-neutral-600 font-bold text-sm mt-1">
                    {formatCurrency(successAmount)} has been credited to your ArtCard account.
                  </p>
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mt-2 bg-emerald-50 py-1 px-3 border border-emerald-300 inline-block">
                    NEW BALANCE: {formatCurrency(walletBalance + successAmount)}
                  </p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={handleReset}
                    className="flex-1 bg-black text-[#D4FF00] hover:bg-[#D4FF00] hover:text-black py-4 border-2 border-black font-black uppercase tracking-widest text-sm transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                  >
                    CONTINUE SHOPPING
                  </button>
                  <button
                    onClick={() => {
                      setIsSuccess(false);
                      setTrxId('TXN' + Math.floor(10000000 + Math.random() * 90000000));
                    }}
                    className="px-6 bg-white hover:bg-neutral-100 py-4 border-2 border-black font-black uppercase tracking-widest text-xs transition-colors"
                  >
                    ADD MORE
                  </button>
                </div>
              </div>
            ) : !user ? (
              <div className="py-8 text-center space-y-4">
                <p className="font-black text-sm uppercase text-neutral-600">
                  PLEASE SIGN IN TO MANAGE OR LOAD MONEY INTO YOUR ARTCARD WALLET.
                </p>
                <button
                  onClick={() => {
                    onClose();
                    if (onOpenAuth) onOpenAuth();
                  }}
                  className="bg-black text-[#D4FF00] px-8 py-4 font-black uppercase tracking-widest text-sm border-2 border-black hover:bg-[#D4FF00] hover:text-black transition-colors"
                >
                  SIGN IN TO CONTINUE
                </button>
              </div>
            ) : (
              <form onSubmit={handleTopUp} className="space-y-6">
                {/* Amount Selector */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-3">
                    SELECT TOP-UP AMOUNT (BDT / ৳)
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5 mb-3">
                    {presetAmounts.map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => handleSelectPreset(amt)}
                        className={`py-3 px-2 text-xs font-black tracking-wider uppercase border-2 border-black transition-all ${
                          selectedAmount === amt && !customAmount
                            ? 'bg-black text-[#D4FF00] shadow-[3px_3px_0px_0px_#D4FF00] -translate-y-0.5'
                            : 'bg-white text-black hover:bg-neutral-100'
                        }`}
                      >
                        ৳{amt}
                      </button>
                    ))}
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-base text-neutral-400">
                      ৳
                    </span>
                    <input
                      type="number"
                      min="50"
                      step="50"
                      placeholder="OR ENTER CUSTOM AMOUNT (MIN ৳50)"
                      value={customAmount}
                      onChange={handleCustomChange}
                      className="w-full bg-neutral-50 border-2 border-black py-3.5 pl-9 pr-4 font-black text-sm uppercase text-black placeholder-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#D4FF00]"
                    />
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-500 mb-3">
                    CHOOSE PAYMENT GATEWAY
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'bkash', name: 'bKash', desc: 'বাংলাদেশ', color: 'border-pink-600 hover:bg-pink-50' },
                      { id: 'nagad', name: 'Nagad', desc: 'ডাক বিভাগ', color: 'border-amber-600 hover:bg-amber-50' },
                      { id: 'card', name: 'Card', desc: 'VISA/Master', color: 'border-blue-600 hover:bg-blue-50' },
                      { id: 'instant', name: 'Instant', desc: '1-Click Demo', color: 'border-emerald-600 hover:bg-emerald-50' }
                    ].map((m) => (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={`p-3 border-2 border-black text-left flex flex-col justify-between transition-all ${
                          paymentMethod === m.id
                            ? 'bg-black text-white shadow-[3px_3px_0px_0px_#D4FF00]'
                            : `bg-white text-black ${m.color}`
                        }`}
                      >
                        <span className={`text-xs font-black uppercase tracking-wider ${paymentMethod === m.id ? 'text-[#D4FF00]' : ''}`}>
                          {m.name}
                        </span>
                        <span className={`text-[9px] font-bold uppercase mt-1 ${paymentMethod === m.id ? 'text-neutral-400' : 'text-neutral-500'}`}>
                          {m.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Simulated Credentials info */}
                {paymentMethod === 'bkash' || paymentMethod === 'nagad' ? (
                  <div className="bg-neutral-100 border-2 border-black p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs font-black uppercase text-neutral-700">
                      <span>{paymentMethod.toUpperCase()} MERCHANT NO:</span>
                      <span className="bg-black text-[#D4FF00] px-2 py-0.5 font-mono">01800-ARTCARD</span>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                        YOUR {paymentMethod.toUpperCase()} NUMBER
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        className="w-full bg-white border-2 border-black p-2 font-bold text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                        TRANSACTION ID (TRXID)
                      </label>
                      <input
                        type="text"
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                        className="w-full bg-white border-2 border-black p-2 font-mono font-bold text-xs uppercase"
                      />
                    </div>
                  </div>
                ) : paymentMethod === 'card' ? (
                  <div className="bg-neutral-100 border-2 border-black p-4 space-y-3">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                        CARD NUMBER (DEMO)
                      </label>
                      <input
                        type="text"
                        defaultValue="4111 •••• •••• 4242"
                        className="w-full bg-white border-2 border-black p-2 font-mono text-xs font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                          EXPIRY
                        </label>
                        <input
                          type="text"
                          defaultValue="12/28"
                          className="w-full bg-white border-2 border-black p-2 font-mono text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-neutral-500 mb-1">
                          CVC
                        </label>
                        <input
                          type="text"
                          defaultValue="789"
                          className="w-full bg-white border-2 border-black p-2 font-mono text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border-2 border-emerald-600 p-4 text-xs font-bold text-emerald-900 flex items-center gap-2">
                    <Sparkles size={18} className="text-emerald-600 shrink-0" />
                    <span>Instant demo recharge will credit <strong>{formatCurrency(activeAmount)}</strong> to your account immediately.</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isProcessing || !activeAmount || activeAmount <= 0}
                  className={`w-full py-4 border-2 border-black font-black uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                    isProcessing
                      ? 'bg-neutral-300 text-neutral-600 cursor-wait'
                      : 'bg-[#D4FF00] hover:bg-black hover:text-[#D4FF00] text-black'
                  }`}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      PROCESSING PAYMENT...
                    </div>
                  ) : (
                    <>
                      <Plus size={18} strokeWidth={3} />
                      LOAD {formatCurrency(activeAmount)} TO WALLET
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
