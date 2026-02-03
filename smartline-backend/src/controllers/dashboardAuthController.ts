import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

// Dashboard user type
type DashboardRole = 'super_admin' | 'admin' | 'manager' | 'viewer';

interface DashboardUser {
  id: string;
  email: string;
  full_name: string;
  role: DashboardRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Login for dashboard users
 */
export const loginDashboard = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Find user by email
    const { data: user, error } = await supabase
      .from('dashboard_users')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Your account has been disabled. Please contact the administrator.',
        },
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
        },
      });
    }

    // Update last login time
    await supabase
      .from('dashboard_users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Get user permissions
    const { data: permissions } = await supabase
      .from('dashboard_permissions')
      .select('page, can_view, can_create, can_edit, can_delete')
      .eq('role', user.role);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email,
        role: user.role 
      },
      config.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Remove password_hash from response
    const { password_hash: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        permissions: permissions || [],
        token,
      },
    });
  } catch (error: any) {
    console.error('Dashboard login error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during login',
      },
    });
  }
};

/**
 * Register a new dashboard user (Super Admin only)
 */
export const registerDashboardUser = async (req: Request, res: Response) => {
  const { email, password, full_name, role } = req.body;
  const createdBy = req.user?.id; // From auth middleware

  try {
    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('dashboard_users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: 'A user with this email already exists',
        },
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const { data: newUser, error } = await supabase
      .from('dashboard_users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: full_name.trim(),
        role: role || 'viewer',
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating dashboard user:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create user',
        },
      });
    }

    // Remove password_hash from response
    const { password_hash: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
      },
    });
  } catch (error: any) {
    console.error('Dashboard register error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred during registration',
      },
    });
  }
};

/**
 * Get all dashboard users (Super Admin and Admin only)
 */
export const getDashboardUsers = async (req: Request, res: Response) => {
  try {
    const { data: users, error } = await supabase
      .from('dashboard_users')
      .select('id, email, full_name, role, is_active, last_login_at, created_at, updated_at, created_by')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching dashboard users:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch users',
        },
      });
    }

    res.json({
      success: true,
      data: { users },
    });
  } catch (error: any) {
    console.error('Get dashboard users error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching users',
      },
    });
  }
};

/**
 * Get current dashboard user profile
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    const { data: user, error } = await supabase
      .from('dashboard_users')
      .select('id, email, full_name, role, is_active, last_login_at, created_at, updated_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Get user permissions
    const { data: permissions } = await supabase
      .from('dashboard_permissions')
      .select('page, can_view, can_create, can_edit, can_delete')
      .eq('role', user.role);

    res.json({
      success: true,
      data: {
        user,
        permissions: permissions || [],
      },
    });
  } catch (error: any) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching user profile',
      },
    });
  }
};

/**
 * Update dashboard user (Super Admin only, or self for non-role fields)
 */
export const updateDashboardUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { full_name, role, is_active } = req.body;
  const currentUserId = req.user?.id;
  const currentUserRole = req.user?.role;

  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('dashboard_users')
      .select('id, role')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Only super_admin can change roles or disable users
    // Users can update their own name only
    let updateData: any = {};
    
    if (currentUserRole === 'super_admin') {
      // Super admin can update everything
      if (full_name !== undefined) updateData.full_name = full_name.trim();
      if (role !== undefined) updateData.role = role;
      if (is_active !== undefined) updateData.is_active = is_active;
    } else if (currentUserId === id && full_name !== undefined) {
      // Regular users can only update their name
      updateData.full_name = full_name.trim();
    } else {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this user',
        },
      });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: updatedUser, error } = await supabase
      .from('dashboard_users')
      .update(updateData)
      .eq('id', id)
      .select('id, email, full_name, role, is_active, last_login_at, created_at, updated_at')
      .single();

    if (error) {
      console.error('Error updating dashboard user:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to update user',
        },
      });
    }

    res.json({
      success: true,
      data: {
        user: updatedUser,
      },
    });
  } catch (error: any) {
    console.error('Update dashboard user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating user',
      },
    });
  }
};

/**
 * Delete dashboard user (Super Admin only)
 */
export const deleteDashboardUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const currentUserId = req.user?.id;

  try {
    // Prevent self-deletion
    if (id === currentUserId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SELF_DELETE',
          message: 'You cannot delete your own account',
        },
      });
    }

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('dashboard_users')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    const { error } = await supabase
      .from('dashboard_users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting dashboard user:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete user',
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: 'User deleted successfully',
      },
    });
  } catch (error: any) {
    console.error('Delete dashboard user error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while deleting user',
      },
    });
  }
};

/**
 * Change password for dashboard user
 */
export const changePassword = async (req: Request, res: Response) => {
  const { current_password, new_password } = req.body;
  const userId = req.user?.id;

  try {
    // Get user with password hash
    const { data: user, error } = await supabase
      .from('dashboard_users')
      .select('password_hash')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_PASSWORD',
          message: 'Current password is incorrect',
        },
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const newPasswordHash = await bcrypt.hash(new_password, salt);

    // Update password
    const { error: updateError } = await supabase
      .from('dashboard_users')
      .update({ 
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error changing password:', updateError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to change password',
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Password changed successfully',
      },
    });
  } catch (error: any) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while changing password',
      },
    });
  }
};

/**
 * Reset password for a user (Super Admin only)
 */
export const resetPassword = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { new_password } = req.body;

  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('dashboard_users')
      .select('id')
      .eq('id', id)
      .single();

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const newPasswordHash = await bcrypt.hash(new_password, salt);

    // Update password
    const { error: updateError } = await supabase
      .from('dashboard_users')
      .update({ 
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error resetting password:', updateError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: 'Failed to reset password',
        },
      });
    }

    res.json({
      success: true,
      data: {
        message: 'Password reset successfully',
      },
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while resetting password',
      },
    });
  }
};

/**
 * Get permissions for a role
 */
export const getRolePermissions = async (req: Request, res: Response) => {
  const { role } = req.params;

  try {
    const { data: permissions, error } = await supabase
      .from('dashboard_permissions')
      .select('page, can_view, can_create, can_edit, can_delete')
      .eq('role', role);

    if (error) {
      console.error('Error fetching permissions:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch permissions',
        },
      });
    }

    res.json({
      success: true,
      data: { permissions },
    });
  } catch (error: any) {
    console.error('Get role permissions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while fetching permissions',
      },
    });
  }
};

/**
 * Update permissions for a role (Super Admin only)
 */
export const updateRolePermissions = async (req: Request, res: Response) => {
  const { role } = req.params;
  const { permissions } = req.body; // Array of { page, can_view, can_create, can_edit, can_delete }

  try {
    // Update each permission
    for (const perm of permissions) {
      const { error } = await supabase
        .from('dashboard_permissions')
        .upsert({
          role,
          page: perm.page,
          can_view: perm.can_view,
          can_create: perm.can_create,
          can_edit: perm.can_edit,
          can_delete: perm.can_delete,
        }, {
          onConflict: 'role,page'
        });

      if (error) {
        console.error('Error updating permission:', error);
        return res.status(500).json({
          success: false,
          error: {
            code: 'UPDATE_FAILED',
            message: 'Failed to update permissions',
          },
        });
      }
    }

    // Fetch updated permissions
    const { data: updatedPermissions } = await supabase
      .from('dashboard_permissions')
      .select('page, can_view, can_create, can_edit, can_delete')
      .eq('role', role);

    res.json({
      success: true,
      data: { permissions: updatedPermissions },
    });
  } catch (error: any) {
    console.error('Update role permissions error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while updating permissions',
      },
    });
  }
};

/**
 * Initialize first super admin (can only be run if no users exist)
 */
export const initializeSuperAdmin = async (req: Request, res: Response) => {
  const { email, password, full_name } = req.body;

  try {
    // Check if any dashboard users exist
    const { count, error: countError } = await supabase
      .from('dashboard_users')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('Error checking existing users:', countError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'CHECK_FAILED',
          message: 'Failed to check existing users',
        },
      });
    }

    // If users already exist, reject
    if (count && count > 0) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ALREADY_INITIALIZED',
          message: 'Dashboard already has users. Use the admin interface to create new users.',
        },
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create super admin
    const { data: newUser, error } = await supabase
      .from('dashboard_users')
      .insert({
        email: email.toLowerCase().trim(),
        password_hash: passwordHash,
        full_name: full_name.trim(),
        role: 'super_admin',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating super admin:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'CREATE_FAILED',
          message: 'Failed to create super admin',
        },
      });
    }

    // Remove password_hash from response
    const { password_hash: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      data: {
        message: 'Super admin created successfully',
        user: userWithoutPassword,
      },
    });
  } catch (error: any) {
    console.error('Initialize super admin error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An error occurred while initializing super admin',
      },
    });
  }
};
