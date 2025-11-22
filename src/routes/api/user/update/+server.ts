import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/db';
import { getUserFromRequest } from '$lib/auth';
import { storage } from '$lib/storage';

export const PUT: RequestHandler = async (event) => {
	const user = getUserFromRequest(event);

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const formData = await event.request.formData();
		const username = formData.get('username') as string;
		const email = formData.get('email') as string;
		const description = formData.get('description') as string;
		const avatarFile = formData.get('avatar') as File | null;
		const bannerFile = formData.get('banner') as File | null;

		if (!username || !email) {
			return json({ error: 'Username and email are required' }, { status: 400 });
		}

		const existingResult = await db.query(
			'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
			[username, email, user.id]
		);

		if (existingResult.rows.length > 0) {
			return json({ error: 'Username or email already taken' }, { status: 409 });
		}

		let avatarUrl = null;
		let bannerUrl = null;

		if (avatarFile && avatarFile.size > 0) {
			const avatarKey = storage.generateFileName(user.id, 'avatar', avatarFile.name);
			const { url } = await storage.upload(avatarFile, avatarKey, avatarFile.type);
			avatarUrl = url;
		}

		if (bannerFile && bannerFile.size > 0) {
			const bannerKey = storage.generateFileName(user.id, 'banner', bannerFile.name);
			const { url } = await storage.upload(bannerFile, bannerKey, bannerFile.type);
			bannerUrl = url;
		}

		// Build dynamic update query
		let query = 'UPDATE users SET username = $1, email = $2, description = $3';
		const params: any[] = [username, email, description || null];
		let paramCount = 4;

		if (avatarUrl) {
			query += `, avatar = $${paramCount}`;
			params.push(avatarUrl);
			paramCount++;
		}

		if (bannerUrl) {
			query += `, banner = $${paramCount}`;
			params.push(bannerUrl);
			paramCount++;
		}

		query += ` WHERE id = $${paramCount} RETURNING id, username, email, avatar, banner, description, created_at`;
		params.push(user.id);

		const result = await db.query(query, params);
		const updatedUser = result.rows[0];

		return json({ user: updatedUser });
	} catch (error: any) {
		console.error('Update error:', error);
		return json({ error: 'Failed to update profile: ' + error.message }, { status: 500 });
	}
};
