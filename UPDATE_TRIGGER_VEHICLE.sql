CREATE OR REPLACE FUNCTION update_driver_on_vehicle_change_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE drivers
        SET 
            vehicle_type = NEW.new_vehicle_type,
            vehicle_model = NEW.new_vehicle_model,
            vehicle_plate = NEW.new_vehicle_plate,
            vehicle_front_url = NEW.new_vehicle_front_url,
            vehicle_back_url = NEW.new_vehicle_back_url,
            vehicle_left_url = NEW.new_vehicle_left_url,
            vehicle_right_url = NEW.new_vehicle_right_url,
            vehicle_license_front_url = NEW.new_vehicle_license_front_url,
            vehicle_license_back_url = NEW.new_vehicle_license_back_url
        WHERE id = NEW.driver_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_approve_vehicle_change ON vehicle_change_requests;

CREATE TRIGGER trigger_approve_vehicle_change
AFTER UPDATE ON vehicle_change_requests
FOR EACH ROW
EXECUTE FUNCTION update_driver_on_vehicle_change_approval();
