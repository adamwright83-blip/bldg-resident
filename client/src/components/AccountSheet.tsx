import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Settings, LogOut } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLogoutUrl } from "@/const";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface AccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenVault?: () => void;
}

export default function AccountSheet({ isOpen, onClose, onOpenVault }: AccountSheetProps) {
  const { logout } = useAuth();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleSignOut = async () => {
    setShowSignOutConfirm(false);
    onClose();
    await logout();
    window.location.href = getLogoutUrl();
  };

  const handleVault = () => {
    onClose();
    onOpenVault?.();
  };

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 bg-black/30 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Bottom Sheet - dark card treatment */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="sheet"
            className="fixed bottom-0 left-0 right-0 profile-menu-sheet z-50 max-h-[80vh] overflow-y-auto"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 profile-menu-handle rounded-full" />
            </div>

            {/* Content - dark card */}
            <div className="profile-menu-card">
              <button
                type="button"
                className="profile-menu-item"
                onClick={handleVault}
              >
                <Lock size={18} className="profile-menu-icon-vault" />
                <span>Vault</span>
              </button>
              <div className="profile-menu-divider" />
              <button
                type="button"
                className="profile-menu-item profile-menu-item-disabled"
                onClick={() => {}}
              >
                <Settings size={18} className="profile-menu-icon" />
                <span>Settings</span>
              </button>
              <div className="profile-menu-divider" />
              <button
                type="button"
                className="profile-menu-item profile-menu-item-logout"
                onClick={() => setShowSignOutConfirm(true)}
              >
                <LogOut size={18} className="profile-menu-icon" />
                <span>Log out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutConfirm} onOpenChange={setShowSignOutConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>Sign out?</AlertDialogTitle>
          <AlertDialogDescription>
            You'll need to log in again to access your account.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Sign out
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
