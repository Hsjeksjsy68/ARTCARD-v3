import { db, doc, getDoc, setDoc } from './firebase';

/**
 * Toggles follow/unfollow between current user and target user
 * Updates both the currentUser's `following` array and targetUser's `followers` array.
 */
export async function toggleFollowUser(currentUserId: string, targetUserId: string): Promise<boolean> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    throw new Error("Invalid user IDs for follow action");
  }

  const currentUserRef = doc(db, 'users', currentUserId);
  const targetUserRef = doc(db, 'users', targetUserId);

  const [currentSnap, targetSnap] = await Promise.all([
    getDoc(currentUserRef),
    getDoc(targetUserRef)
  ]);

  const currentFollowing: string[] = currentSnap.exists() ? (currentSnap.data().following || []) : [];
  const targetFollowers: string[] = targetSnap.exists() ? (targetSnap.data().followers || []) : [];

  const isCurrentlyFollowing = currentFollowing.includes(targetUserId);

  if (isCurrentlyFollowing) {
    // Unfollow action
    const nextFollowing = currentFollowing.filter(id => id !== targetUserId);
    const nextFollowers = targetFollowers.filter(id => id !== currentUserId);

    await Promise.all([
      setDoc(currentUserRef, { following: nextFollowing }, { merge: true }),
      setDoc(targetUserRef, { followers: nextFollowers }, { merge: true })
    ]);

    return false; // Result is unfollowed
  } else {
    // Follow action
    const nextFollowing = Array.from(new Set([...currentFollowing, targetUserId]));
    const nextFollowers = Array.from(new Set([...targetFollowers, currentUserId]));

    await Promise.all([
      setDoc(currentUserRef, { following: nextFollowing }, { merge: true }),
      setDoc(targetUserRef, { followers: nextFollowers }, { merge: true })
    ]);

    return true; // Result is followed
  }
}
