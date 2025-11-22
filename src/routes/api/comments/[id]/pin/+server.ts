import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';

export const POST: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const commentId = event.params.id;

		// Verify user is video author
		const result = await db.query(
			`SELECT c.*, v.user_id as video_owner_id 
			 FROM comments c 
			 JOIN videos v ON c.video_id = v.id 
			 WHERE c.id = $1`,
			[commentId]
		);
		const comment = result.rows[0];

		if (!comment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		if (comment.video_owner_id !== user.id) {
			return json({ error: 'Only video author can pin comments' }, { status: 403 });
		}

		// Unpin all other comments on this video first
		await db.query('UPDATE comments SET is_pinned = false WHERE video_id = $1', [comment.video_id]);

		// Toggle pin on this comment
		const newPinned = !comment.is_pinned;
		await db.query('UPDATE comments SET is_pinned = $1 WHERE id = $2', [newPinned, commentId]);

		return json({ is_pinned: newPinned });
	} catch (error) {
		console.error('Pin error:', error);
		return json({ error: 'Failed to pin comment' }, { status: 500 });
	}
};
