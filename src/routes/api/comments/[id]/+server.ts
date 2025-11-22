import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';

export const DELETE: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const commentId = event.params.id;

		if (!commentId) {
			return json({ error: 'Comment ID required' }, { status: 400 });
		}

		// Get comment info including video owner
		const result = await db.query(
			`SELECT c.user_id, c.video_id, v.user_id as video_owner_id 
			 FROM comments c 
			 JOIN videos v ON c.video_id = v.id 
			 WHERE c.id = $1`,
			[commentId]
		);
		const comment = result.rows[0];

		if (!comment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		// Allow deletion if user is comment author OR video owner
		if (comment.user_id !== user.id && comment.video_owner_id !== user.id) {
			return json({ error: 'Not authorized to delete this comment' }, { status: 403 });
		}

		// Delete comment (this will also delete replies due to CASCADE)
		await db.query('DELETE FROM comments WHERE id = $1', [commentId]);

		return json({ success: true });
	} catch (error) {
		console.error('Delete comment error:', error);
		return json({ error: 'Failed to delete comment' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);
	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const commentId = event.params.id;
		const { content } = await event.request.json();

		if (!commentId || !content) {
			return json({ error: 'Comment ID and content required' }, { status: 400 });
		}

		const result = await db.query('SELECT user_id FROM comments WHERE id = $1', [commentId]);
		const comment = result.rows[0];

		if (!comment) {
			return json({ error: 'Comment not found' }, { status: 404 });
		}

		if (comment.user_id !== user.id) {
			return json({ error: 'Not authorized to edit this comment' }, { status: 403 });
		}

		await db.query('UPDATE comments SET content = $1 WHERE id = $2', [content, commentId]);

		return json({ success: true });
	} catch (error) {
		console.error('Edit comment error:', error);
		return json({ error: 'Failed to edit comment' }, { status: 500 });
	}
};
