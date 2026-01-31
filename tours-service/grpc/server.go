package grpc

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net"
	pb "tours-service/proto/tours"

	"google.golang.org/grpc"
)

type ToursServer struct {
	pb.UnimplementedToursServiceServer
	db *sql.DB
}

func NewToursServer(db *sql.DB) *ToursServer {
	return &ToursServer{db: db}
}

func (s *ToursServer) VerifyTourExists(ctx context.Context, req *pb.VerifyTourRequest) (*pb.VerifyTourResponse, error) {
	log.Printf("[gRPC] VerifyTourExists called for tour_id: %d", req.TourId)

	var name string
	var price float64
	var status string

	query := `SELECT name, price, status FROM tours WHERE id = $1`
	err := s.db.QueryRow(query, req.TourId).Scan(&name, &price, &status)

	if err == sql.ErrNoRows {
		log.Printf("[gRPC] Tour %d not found", req.TourId)
		return &pb.VerifyTourResponse{
			Exists:      false,
			IsPublished: false,
			Error:       "Tour not found",
		}, nil
	}

	if err != nil {
		log.Printf("[gRPC] Error querying tour: %v", err)
		return &pb.VerifyTourResponse{
			Exists: false,
			Error:  fmt.Sprintf("Database error: %v", err),
		}, nil
	}

	isPublished := status == "published"

	log.Printf("[gRPC] Tour %d found: %s, price: %.2f, published: %v", req.TourId, name, price, isPublished)

	return &pb.VerifyTourResponse{
		Exists:      true,
		IsPublished: isPublished,
		Name:        name,
		Price:       price,
	}, nil
}

func (s *ToursServer) VerifyPurchaseToken(ctx context.Context, req *pb.VerifyTokenRequest) (*pb.VerifyTokenResponse, error) {
	log.Printf("[gRPC] VerifyPurchaseToken called for user_id: %d, tour_id: %d", req.UserId, req.TourId)

	return &pb.VerifyTokenResponse{
		HasToken: true,
		Error:    "",
	}, nil
}

func (s *ToursServer) ReserveTours(ctx context.Context, req *pb.ReserveToursRequest) (*pb.ReserveToursResponse, error) {
	log.Printf("[gRPC] ReserveTours called for user_id: %d, tours: %v", req.UserId, req.TourIds)

	for _, tourID := range req.TourIds {
		var status string
		err := s.db.QueryRow(`SELECT status FROM tours WHERE id = $1`, tourID).Scan(&status)
		if err == sql.ErrNoRows {
			return &pb.ReserveToursResponse{
				Success: false,
				Error:   fmt.Sprintf("Tour %d not found", tourID),
			}, nil
		}
		if err != nil {
			return &pb.ReserveToursResponse{
				Success: false,
				Error:   fmt.Sprintf("Database error: %v", err),
			}, nil
		}
		if status != "published" {
			return &pb.ReserveToursResponse{
				Success: false,
				Error:   fmt.Sprintf("Tour %d is not available for purchase (status: %s)", tourID, status),
			}, nil
		}
	}

	log.Printf("[gRPC] All tours reserved successfully for user %d", req.UserId)
	return &pb.ReserveToursResponse{
		Success: true,
	}, nil
}

func StartGRPCServer(db *sql.DB, port string) error {
	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		return fmt.Errorf("failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterToursServiceServer(s, NewToursServer(db))

	log.Printf("[gRPC] Tours gRPC server starting on port %s", port)
	if err := s.Serve(lis); err != nil {
		return fmt.Errorf("failed to serve: %v", err)
	}

	return nil
}
