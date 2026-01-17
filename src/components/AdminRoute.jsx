import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function AdminRoute({ children }) {
    const { currentUser } = useAuth();
    const [isAdmin, setIsAdmin] = React.useState(null); // null = loading

    React.useEffect(() => {
        if (!currentUser) {
            setIsAdmin(false);
            return;
        }

        // Hardcode fallback for safety during migration
        if (currentUser.email === 'bryan.m.hudson@gmail.com') {
            setIsAdmin(true);
            return;
        }

        const checkRole = async () => {
            // We can read the role from the shareholder doc
            // Assuming the shareholder doc is keyed by email or we query by email
            // Best practice: Store role in Custom Claims, but for now Firestore lookup is fine
            try {
                // Import db here to avoid circular dep issues if any, or just use context? 
                // We need to import db from lib/firebase
                const { doc, getDoc } = await import('firebase/firestore');
                const { db } = await import('../lib/firebase');

                const docRef = doc(db, 'shareholders', currentUser.email);
                const snapshot = await getDoc(docRef);

                if (snapshot.exists()) {
                    const role = snapshot.data().role;
                    if (role === 'admin' || role === 'super_admin') {
                        setIsAdmin(true);
                    } else {
                        setIsAdmin(false);
                    }
                } else {
                    setIsAdmin(false);
                }
            } catch (err) {
                console.error("Admin Check Failed", err);
                setIsAdmin(false);
            }
        };

        checkRole();
    }, [currentUser]);

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    if (isAdmin === null) {
        return <div className="p-10 flex justify-center">Loading Permissions...</div>;
    }

    if (!isAdmin) {
        return <Navigate to="/" />;
    }

    return children;
}
