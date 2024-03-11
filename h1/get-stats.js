async function getAllStats(db, isId, isNation, identifier) {
    let sql = `SELECT t.name,
                      n.name AS nation,
                      t.class,
                      projectile_1_type,
                      projectile_2_type,
                      projectile_3_type,
                      projectile_1_dmg,
                      projectile_2_dmg,
                      projectile_3_dmg,
                      projectile_1_pen,
                      projectile_2_pen,
                      projectile_3_pen,
                      projectile_1_velocity,
                      projectile_2_velocity,
                      projectile_3_velocity,
                      projectile_1_min_stun_duration,
                      projectile_1_max_stun_duration,
                      reload_time,
                      clip_size,
                      burst_size,
                      intra_clip_reload,
                      aim_time,
                      dispersion,
                      ammo_capacity,
                      hp,
                      hull_front_armor,
                      hull_side_armor,
                      hull_back_armor,
                      turret_front_armor,
                      turret_side_armor,
                      turret_back_armor,
                      suspension_repair_time,
                      stationary_camo,
                      stationary_camo_after_firing,
                      movement_camo,
                      movement_camo_after_firing,
                      weight,
                      load_limit,
                      engine_hp,
                      top_speed,
                      reverse_speed,
                      hull_traverse_speed,
                      turret_traverse_speed,
                      gun_elevation,
                      gun_depression,
                      view_range,
                      radio_range
               FROM tanks t
                        JOIN nations n ON n.id = t.nation_id
                        JOIN firepower f ON t.id = f.tank_id
                        JOIN survivability s on t.id = s.tank_id
                        JOIN mobility m on t.id = m.tank_id
                        JOIN spotting spt ON t.id = spt.tank_id`;
    if (identifier !== undefined)
        sql += ` WHERE ` + (isNation ? `n` : `t`) + `.` + (isId ? `id` : `alias`) + ` = ?`;
    sql += ` ORDER BY t.name`;
    const [dbResults, dbFields] = await db.query(sql, [identifier]);
    return dbResults.map(row => {
        let stun, clip, turret;
        if (row.projectile_1_min_stun_duration !== null) {
            stun = {
                min: {
                    value: row.projectile_1_min_stun_duration,
                    unit: 's'
                },
                max: {
                    value: row.projectile_1_max_stun_duration,
                    unit: 's'
                }
            }
        }
        if (row.clip_size !== null) {
            clip = {
                size: row.clip_size,
                burstSize: row.burst_size,
                intraClipReload: {
                    value: row.intra_clip_reload,
                    unit: 's'
                }
            }
        }
        if (row.turret_front_armor !== null) {
            turret = {
                front: {
                    value: row.turret_front_armor,
                    unit: 'mm'
                },
                side: {
                    value: row.turret_side_armor,
                    unit: 'mm'
                },
                rear: {
                    value: row.turret_back_armor,
                    unit: 'mm'
                }
            }
        }
        return {
            name: row.name,
            nation: row.nation,
            class: row.class,
            firepower: {
                shell1: {
                    type: row.projectile_1_type,
                    damage: row.projectile_1_dmg,
                    penetration: {
                        value: row.projectile_1_pen,
                        unit: 'mm'
                    },
                    velocity: {
                        value: row.projectile_1_velocity,
                        unit: 'm/s'
                    },
                },
                shell2: {
                    type: row.projectile_2_type,
                    damage: row.projectile_2_dmg,
                    penetration: {
                        value: row.projectile_2_pen,
                        unit: 'mm'
                    },
                    velocity: {
                        value: row.projectile_2_velocity,
                        unit: 'm/s'
                    }
                },
                shell3: {
                    type: row.projectile_3_type,
                    damage: row.projectile_3_dmg,
                    penetration: {
                        value: row.projectile_3_pen,
                        unit: 'mm'
                    },
                    velocity: {
                        value: row.projectile_3_velocity,
                        unit: 'm/s'
                    }
                },
                stun,
                reloadTime: {
                    value: row.reload_time,
                    unit: 's'
                },
                rof: (60 / row.reload_time).toFixed(2),
                clip,
                dpm: (row.projectile_1_dmg * 60 / row.reload_time).toFixed(2),
                aimTime: {
                    value: row.aim_time,
                    unit: 's'
                },
                dispersion: {
                    value: row.dispersion,
                    unit: 'm'
                },
                ammoCapacity: row.ammo_capacity
            },
            survivability: {
                health: row.hp,
                armor: {
                    hull: {
                        front: {
                            value: row.hull_front_armor,
                            unit: 'mm'
                        },
                        side: {
                            value: row.hull_side_armor,
                            unit: 'mm'
                        },
                        rear: {
                            value: row.hull_back_armor,
                            unit: 'mm'
                        }
                    },
                    turret
                },
                suspensionRepairTime: {
                    value: row.suspension_repair_time,
                    unit: 's'
                },
                camo: {
                    stationary: {
                        value: row.stationary_camo,
                        valueAfterFiring: row.stationary_camo_after_firing
                    },
                    moving: {
                        value: row.movement_camo,
                        valueAfterFiring: row.movement_camo_after_firing
                    }
                }
            },
            mobility: {
                weight: {
                    value: row.weight,
                    unit: 't'
                },
                loadLimit: {
                    value: row.load_limit,
                    unit: 't'
                },
                enginePower: {
                    value: row.engine_hp,
                    unit: 'hp'
                },
                powerToWeightRatio: {
                    value: (row.engine_hp / row.weight).toFixed(2),
                    unit: 'hp/t'
                },
                topSpeed: {
                    value: row.top_speed,
                    unit: 'km/h'
                },
                reverseSpeed: {
                    value: row.reverse_speed,
                    unit: 'km/h'
                },
                hullTraverseSpeed: {
                    value: row.hull_traverse_speed,
                    unit: '°/s'
                },
                turretTraverseSpeed: {
                    value: row.turret_traverse_speed,
                    unit: '°/s'
                },
                gunElevation: {
                    value: row.gun_elevation,
                    unit: '°'
                },
                gunDepression: {
                    value: row.gun_depression,
                    unit: '°'
                }
            },
            spotting: {
                viewRange: {
                    value: row.view_range,
                    unit: 'm'
                },
                radioRange: {
                    value: row.radio_range,
                    unit: 'm'
                }
            }
        }
    });
}

async function getFirepowerStats(db, isId, isNation, identifier) {
    let sql = `SELECT projectile_1_type,
                      projectile_2_type,
                      projectile_3_type,
                      projectile_1_dmg,
                      projectile_2_dmg,
                      projectile_3_dmg,
                      projectile_1_pen,
                      projectile_2_pen,
                      projectile_3_pen,
                      projectile_1_velocity,
                      projectile_2_velocity,
                      projectile_3_velocity,
                      projectile_1_min_stun_duration,
                      projectile_1_max_stun_duration,
                      reload_time,
                      clip_size,
                      burst_size,
                      intra_clip_reload,
                      aim_time,
                      dispersion,
                      ammo_capacity
               FROM firepower f
                        JOIN tanks t ON t.id = f.tank_id
                        JOIN nations n ON n.id = t.nation_id`;
    sql += ` WHERE ` + (isNation ? `n` : `t`) + `.` + (isId ? `id` : `alias`) + ` = ?`;
    const [dbResults, dbFields] = await db.query(sql, [identifier]);
    return dbResults.map(row => {
        let stun, clip;
        if (row.projectile_1_min_stun_duration !== null) {
            stun = {
                min: {
                    value: row.projectile_1_min_stun_duration,
                    unit: 's'
                },
                max: {
                    value: row.projectile_1_max_stun_duration,
                    unit: 's'
                }
            }
        }
        if (row.clip_size !== null) {
            clip = {
                size: row.clip_size,
                burstSize: row.burst_size,
                intraClipReload: {
                    value: row.intra_clip_reload,
                    unit: 's'
                }
            }
        }
        return {
            shell1: {
                type: row.projectile_1_type,
                damage: row.projectile_1_dmg,
                penetration: {
                    value: row.projectile_1_pen,
                    unit: 'mm'
                },
                velocity: {
                    value: row.projectile_1_velocity,
                    unit: 'm/s'
                },
            },
            shell2: {
                type: row.projectile_2_type,
                damage: row.projectile_2_dmg,
                penetration: {
                    value: row.projectile_2_pen,
                    unit: 'mm'
                },
                velocity: {
                    value: row.projectile_2_velocity,
                    unit: 'm/s'
                }
            },
            shell3: {
                type: row.projectile_3_type,
                damage: row.projectile_3_dmg,
                penetration: {
                    value: row.projectile_3_pen,
                    unit: 'mm'
                },
                velocity: {
                    value: row.projectile_3_velocity,
                    unit: 'm/s'
                }
            },
            stun,
            reloadTime: {
                value: row.reload_time,
                unit: 's'
            },
            rof: (60 / row.reload_time).toFixed(2),
            clip,
            dpm: (row.projectile_1_dmg * 60 / row.reload_time).toFixed(2),
            aimTime: {
                value: row.aim_time,
                unit: 's'
            },
            dispersion: {
                value: row.dispersion,
                unit: 'm'
            },
            ammoCapacity: row.ammo_capacity
        }
    });
}

async function getSurvivabilityStats(db, isId, isNation, identifier) {
    let sql = `SELECT hp,
                      hull_front_armor,
                      hull_side_armor,
                      hull_back_armor,
                      turret_front_armor,
                      turret_side_armor,
                      turret_back_armor,
                      suspension_repair_time,
                      stationary_camo,
                      stationary_camo_after_firing,
                      movement_camo,
                      movement_camo_after_firing
               FROM survivability s
                        JOIN tanks t ON t.id = s.tank_id
                        JOIN nations n ON n.id = t.nation_id`;
    sql += ` WHERE ` + (isNation ? `n` : `t`) + `.` + (isId ? `id` : `alias`) + ` = ?`;
    const [dbResults, dbFields] = await db.query(sql, [identifier]);
    return dbResults.map(row => {
        let turret;
        if (row.turret_front_armor !== null) {
            turret = {
                front: {
                    value: row.turret_front_armor,
                    unit: 'mm'
                },
                side: {
                    value: row.turret_side_armor,
                    unit: 'mm'
                },
                rear: {
                    value: row.turret_back_armor,
                    unit: 'mm'
                }
            }
        }
        return {
            health: row.hp,
            armor: {
                hull: {
                    front: {
                        value: row.hull_front_armor,
                        unit: 'mm'
                    },
                    side: {
                        value: row.hull_side_armor,
                        unit: 'mm'
                    },
                    rear: {
                        value: row.hull_back_armor,
                        unit: 'mm'
                    }
                },
                turret
            },
            suspensionRepairTime: {
                value: row.suspension_repair_time,
                unit: 's'
            },
            camo: {
                stationary: {
                    value: row.stationary_camo,
                    valueAfterFiring: row.stationary_camo_after_firing
                },
                moving: {
                    value: row.movement_camo,
                    valueAfterFiring: row.movement_camo_after_firing
                }
            }
        }
    });
}

async function getMobilityStats(db, isId, isNation, identifier) {
    let sql = `SELECT weight,
                      load_limit,
                      engine_hp,
                      top_speed,
                      reverse_speed,
                      hull_traverse_speed,
                      turret_traverse_speed,
                      gun_elevation,
                      gun_depression
               FROM mobility m
                        JOIN tanks t ON t.id = m.tank_id
                        JOIN nations n ON n.id = t.nation_id`;
    sql += ` WHERE ` + (isNation ? `n` : `t`) + `.` + (isId ? `id` : `alias`) + ` = ?`;
    const [dbResults, dbFields] = await db.query(sql, [identifier]);
    return dbResults.map(row => {
        return {
            weight: {
                value: row.weight,
                unit: 't'
            },
            loadLimit: {
                value: row.load_limit,
                unit: 't'
            },
            enginePower: {
                value: row.engine_hp,
                unit: 'hp'
            },
            powerToWeightRatio: {
                value: (row.engine_hp / row.weight).toFixed(2),
                unit: 'hp/t'
            },
            topSpeed: {
                value: row.top_speed,
                unit: 'km/h'
            },
            reverseSpeed: {
                value: row.reverse_speed,
                unit: 'km/h'
            },
            hullTraverseSpeed: {
                value: row.hull_traverse_speed,
                unit: '°/s'
            },
            turretTraverseSpeed: {
                value: row.turret_traverse_speed,
                unit: '°/s'
            },
            gunElevation: {
                value: row.gun_elevation,
                unit: '°'
            },
            gunDepression: {
                value: row.gun_depression,
                unit: '°'
            }
        }
    });
}

async function getSpottingStats(db, isId, isNation, identifier) {
    let sql = `SELECT view_range,
                      radio_range
               FROM spotting s
                        JOIN tanks t ON t.id = s.tank_id
                        JOIN nations n ON n.id = t.nation_id`;
    sql += ` WHERE ` + (isNation ? `n` : `t`) + `.` + (isId ? `id` : `alias`) + ` = ?`;
    const [dbResults, dbFields] = await db.query(sql, [identifier]);
    return dbResults.map(row => {
        return {
            viewRange: {
                value: row.view_range,
                unit: 'm'
            },
            radioRange: {
                value: row.radio_range,
                unit: 'm'
            }
        }
    });
}

module.exports = {
    getAllStats,
    getFirepowerStats,
    getSurvivabilityStats,
    getMobilityStats,
    getSpottingStats
};